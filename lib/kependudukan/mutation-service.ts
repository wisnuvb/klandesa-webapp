/**
 * Alur mutasi penduduk (lahir, meninggal, pindah, datang, ganti KK): ajukan → putuskan/batalkan.
 * Tanpa HTTP, agar dapat diuji terhadap MySQL. Semua tulis penerapan terjadi dalam SATU transaksi:
 * klaim baris PENDING (anti-ganda) → ubah warga → catat mutasi → sinkronkan rumah tangga/wilayah.
 *
 * NIK lengkap TIDAK disimpan di `details` mutasi: kelahiran memakai NIK yang diisi saat persetujuan, dan NIK ibu
 * hanya dipakai untuk menemukan KK-nya lalu dibuang.
 */
import type { Prisma } from "@prisma/client";
import { normalizeKk } from "./household";
import {
  planMutationEffect,
  validateMutation,
  type MutationInput,
  type MutationResidentRef,
  type MutationSource,
  type MutationType,
  type NewResidentData,
} from "./mutation";
import { prisma } from "@/lib/prisma";
import { reactivateCitizenAccounts, suspendCitizenAccounts } from "@/lib/mobile/citizen-status";
import { syncResidents, type Db } from "./sync";

export type ServiceResult<T> = { ok: true; data: T } | { ok: false; status: number; errors: string[] };
export const fail = (status: number, ...errors: string[]): { ok: false; status: number; errors: string[] } => ({ ok: false, status, errors });

const REF_SELECT = { id: true, isAlive: true, moveDate: true, birthDate: true, kk: true, familyRole: true, name: true, nik: true, rt: true, rw: true, address: true, religion: true } as const;

type ResidentFull = MutationResidentRef & { name: string; nik: string; rt: string | null; rw: string | null; address: string; religion: string };

const clean = (s: string | undefined | null) => s?.trim() || undefined;

/** Buang NIK dari data warga baru; ibu dipakai hanya untuk menemukan KK dan nama. */
async function sanitizeNewResident(db: Db, villageId: number, n: NewResidentData | undefined): Promise<NewResidentData | undefined> {
  if (!n) return n;
  const { nik: _nik, fatherNik, motherNik, ...rest } = n;
  void _nik;
  const out: NewResidentData = { ...rest };
  const lookup = async (nik: string | undefined) => (nik && /^\d{16}$/.test(nik) ? db.resident.findFirst({ where: { villageId, nik }, select: { kk: true, name: true, address: true, rt: true, rw: true, hamlet: true } }) : null);
  const mother = await lookup(motherNik);
  const father = await lookup(fatherNik);
  if (mother) {
    out.motherName = out.motherName ?? mother.name;
    if (!out.kk && normalizeKk(mother.kk)) out.kk = mother.kk!;
  }
  if (father) {
    out.fatherName = out.fatherName ?? father.name;
    if (!out.kk && normalizeKk(father.kk)) out.kk = father.kk!;
  }
  return out;
}

async function loadResident(db: Db, villageId: number, id: number | null | undefined): Promise<ResidentFull | null> {
  if (id == null) return null;
  return db.resident.findFirst({ where: { id, villageId }, select: REF_SELECT });
}

export interface SubmitArgs {
  villageId: number;
  userId: number | null;
  input: MutationInput;
  source?: MutationSource;
  now?: Date;
}

export async function submitMutation(db: Db, a: SubmitArgs): Promise<ServiceResult<{ id: string }>> {
  const now = a.now ?? new Date();
  const resident = await loadResident(db, a.villageId, a.input.residentId);
  if (a.input.residentId != null && !resident) return fail(404, "Warga tidak ditemukan di desa ini.");

  const v = validateMutation(a.input, resident, now, "submit");
  if (!v.ok) return fail(422, ...v.errors);

  if (a.input.residentId != null) {
    const dup = await db.residentMutation.findFirst({ where: { villageId: a.villageId, residentId: a.input.residentId, type: a.input.type, status: "PENDING" }, select: { id: true } });
    if (dup) return fail(409, "Sudah ada pengajuan yang sama untuk warga ini dan masih menunggu keputusan.");
  }

  const details = { ...a.input.details, newResident: await sanitizeNewResident(db, a.villageId, a.input.details?.newResident) };
  const created = await db.residentMutation.create({
    data: {
      villageId: a.villageId,
      type: a.input.type,
      status: "PENDING",
      source: a.source ?? "web",
      effectiveDate: new Date(`${a.input.effectiveDate}T00:00:00.000Z`),
      residentId: resident?.id ?? null,
      residentName: resident?.name.slice(0, 255) ?? clean(details.newResident?.name)?.slice(0, 255) ?? null,
      residentNikLast4: resident?.nik.slice(-4) ?? null,
      rt: resident?.rt ?? clean(details.newResident?.rt) ?? null,
      rw: resident?.rw ?? clean(details.newResident?.rw) ?? null,
      householdKk: normalizeKk(resident?.kk ?? details.newResident?.kk),
      details: JSON.parse(JSON.stringify(details)) as Prisma.InputJsonValue,
      requestedById: a.userId,
    },
    select: { id: true },
  });
  return { ok: true, data: { id: String(created.id) } };
}

export interface DecideArgs {
  villageId: number;
  mutationId: bigint;
  userId: number | null;
  decision: "approve" | "reject";
  reason?: string;
  /** NIK warga baru (kelahiran/datang). Diminta saat persetujuan; tidak disimpan di `details`. */
  nik?: string;
  now?: Date;
}

export interface DecideOutcome {
  status: "APPLIED" | "REJECTED";
  residentId: number | null;
  suspendResidentId: number | null;
  /** Warga yang kembali ke desa: akun mobilenya diaktifkan lagi setelah commit. */
  reactivateResidentId: number | null;
}

/** Putuskan pengajuan. Jalankan di dalam `prisma.$transaction`; `suspendResidentId` harus diproses pemanggil setelah commit. */
export async function decideMutation(tx: Db, a: DecideArgs): Promise<ServiceResult<DecideOutcome>> {
  const now = a.now ?? new Date();
  const row = await tx.residentMutation.findFirst({ where: { id: a.mutationId, villageId: a.villageId } });
  if (!row) return fail(404, "Pengajuan tidak ditemukan.");
  if (row.status !== "PENDING") return fail(409, "Pengajuan ini sudah diputuskan atau dibatalkan.");

  if (a.decision === "reject") {
    const reason = clean(a.reason);
    if (!reason) return fail(422, "Alasan penolakan wajib diisi.");
    const claimed = await tx.residentMutation.updateMany({
      where: { id: row.id, villageId: a.villageId, status: "PENDING" },
      data: { status: "REJECTED", decidedById: a.userId, decidedAt: now, rejectionReason: reason.slice(0, 500) },
    });
    if (claimed.count !== 1) return fail(409, "Pengajuan ini sudah diputuskan.");
    return { ok: true, data: { status: "REJECTED", residentId: row.residentId, suspendResidentId: null, reactivateResidentId: null } };
  }

  // Klaim dulu: dua persetujuan serentak, hanya satu yang lolos.
  const claimed = await tx.residentMutation.updateMany({
    where: { id: row.id, villageId: a.villageId, status: "PENDING" },
    data: { status: "APPLIED", decidedById: a.userId, decidedAt: now, appliedAt: now },
  });
  if (claimed.count !== 1) return fail(409, "Pengajuan ini sudah diputuskan.");

  const stored = (row.details ?? {}) as MutationInputDetails;
  const nik = clean(a.nik);
  const input: MutationInput = {
    type: row.type as MutationType,
    effectiveDate: row.effectiveDate.toISOString().slice(0, 10),
    residentId: row.residentId,
    details: { ...stored, newResident: stored.newResident ? { ...stored.newResident, ...(nik ? { nik } : {}) } : undefined },
  };

  const resident = await loadResident(tx, a.villageId, row.residentId);
  if (row.residentId != null && !resident) return fail(409, "Warga pada pengajuan ini sudah tidak ada.");

  const v = validateMutation(input, resident, now, "apply");
  if (!v.ok) return fail(422, ...v.errors);

  const effect = planMutationEffect(input, resident);
  let residentId = row.residentId;
  const touchedKks: Array<string | null> = [resident?.kk ?? null];
  let snapshot: { name: string; nikLast4: string; rt: string | null; rw: string | null; kk: string | null } | null = null;

  if (effect.create) {
    const c = effect.create;
    const kk = normalizeKk(c.kk);
    const head = kk ? await tx.resident.findFirst({ where: { villageId: a.villageId, kk, familyRole: "Kepala Keluarga" }, select: { address: true, religion: true, rt: true, rw: true, hamlet: true } }) : null;
    const anyMember = !head && kk ? await tx.resident.findFirst({ where: { villageId: a.villageId, kk }, select: { address: true, religion: true, rt: true, rw: true, hamlet: true } }) : null;
    const base = head ?? anyMember;
    const religion = clean(c.religion) ?? base?.religion;
    const address = clean(c.address) ?? base?.address;
    if (!religion) return fail(422, "Agama warga baru belum diketahui. Isi agama, atau tautkan ke KK yang sudah punya anggota.");
    if (!address) return fail(422, "Alamat warga baru belum diketahui. Isi alamat, atau tautkan ke KK yang sudah punya anggota.");
    const dup = await tx.resident.findFirst({ where: { villageId: a.villageId, nik: c.nik! }, select: { id: true } });
    if (dup) return fail(409, "NIK ini sudah terdaftar di desa.");
    const created = await tx.resident.create({
      data: {
        villageId: a.villageId,
        nik: c.nik!,
        kk,
        name: c.name!.trim(),
        gender: c.gender!,
        birthplace: c.birthplace!.trim(),
        birthDate: new Date(`${c.birthDate}T00:00:00.000Z`),
        religion,
        maritalStatus: clean(c.maritalStatus) ?? "Belum Menikah",
        familyRole: c.familyRole || "Anak",
        address,
        rt: clean(c.rt) ?? base?.rt ?? null,
        rw: clean(c.rw) ?? base?.rw ?? null,
        hamlet: clean(c.hamlet) ?? base?.hamlet ?? null,
        fatherName: clean(c.fatherName) ?? null,
        motherName: clean(c.motherName) ?? null,
      },
      select: { id: true, name: true, nik: true, rt: true, rw: true, kk: true },
    });
    residentId = created.id;
    snapshot = { name: created.name, nikLast4: created.nik.slice(-4), rt: created.rt, rw: created.rw, kk: created.kk };
    touchedKks.push(created.kk);
  } else if (effect.update && residentId != null) {
    const u = effect.update;
    const data: Prisma.ResidentUpdateInput = {};
    if (u.isAlive !== undefined) data.isAlive = u.isAlive;
    if (u.deathDate !== undefined) data.deathDate = u.deathDate;
    if (u.moveDate !== undefined) data.moveDate = u.moveDate;
    if (u.kk !== undefined) data.kk = u.kk;
    if (u.familyRole !== undefined) data.familyRole = u.familyRole;
    await tx.resident.update({ where: { id: residentId }, data });
    touchedKks.push(u.kk ?? null);
  }

  if (residentId != null) await syncResidents(tx, a.villageId, [residentId], touchedKks);

  const finalDetails = { ...stored, newResident: stored.newResident ? { ...stored.newResident, nik: undefined } : undefined };
  await tx.residentMutation.update({
    where: { id: row.id },
    data: {
      residentId,
      ...(snapshot ? { residentName: snapshot.name, residentNikLast4: snapshot.nikLast4, rt: snapshot.rt, rw: snapshot.rw, householdKk: normalizeKk(snapshot.kk) } : {}),
      details: JSON.parse(JSON.stringify(finalDetails)) as Prisma.InputJsonValue,
    },
  });

  return {
    ok: true,
    data: {
      status: "APPLIED",
      residentId,
      suspendResidentId: effect.suspendAccount ? residentId : null,
      reactivateResidentId: input.type === "MOVE_IN" && row.residentId != null ? residentId : null,
    },
  };
}

type MutationInputDetails = MutationInput["details"];

export async function cancelMutation(db: Db, args: { villageId: number; mutationId: bigint; userId: number | null; isDecider: boolean }): Promise<ServiceResult<{ status: "CANCELLED" }>> {
  const row = await db.residentMutation.findFirst({ where: { id: args.mutationId, villageId: args.villageId } });
  if (!row) return fail(404, "Pengajuan tidak ditemukan.");
  if (row.status !== "PENDING") return fail(409, "Hanya pengajuan yang masih menunggu yang bisa dibatalkan.");
  if (!args.isDecider && row.requestedById !== args.userId) return fail(403, "Hanya pengaju atau pejabat yang berwenang yang bisa membatalkan.");
  const r = await db.residentMutation.updateMany({ where: { id: row.id, villageId: args.villageId, status: "PENDING" }, data: { status: "CANCELLED", decidedById: args.userId, decidedAt: new Date() } });
  if (r.count !== 1) return fail(409, "Pengajuan ini sudah diputuskan.");
  return { ok: true, data: { status: "CANCELLED" } };
}

class Abort extends Error {
  constructor(readonly result: { ok: false; status: number; errors: string[] }) {
    super("abort");
  }
}

/**
 * Putuskan dalam satu transaksi: bila ada kegagalan validasi di tengah, SEMUA perubahan (termasuk klaim PENDING → APPLIED)
 * dibatalkan, sehingga pengajuan tetap menunggu. Akun mobile warga dinonaktifkan setelah commit.
 */
export async function decideMutationAtomic(args: DecideArgs): Promise<ServiceResult<DecideOutcome>> {
  let outcome: DecideOutcome;
  try {
    outcome = await prisma.$transaction(
      async (tx) => {
        const r = await decideMutation(tx, args);
        if (!r.ok) throw new Abort(r);
        return r.data;
      },
      { maxWait: 10_000, timeout: 20_000 },
    );
  } catch (e) {
    if (e instanceof Abort) return e.result;
    throw e;
  }
  if (outcome.suspendResidentId != null) {
    try {
      await suspendCitizenAccounts(args.villageId, [outcome.suspendResidentId]);
    } catch (e) {
      console.error("[mutasi] gagal menonaktifkan akun mobile:", e instanceof Error ? e.message : e);
    }
  }
  if (outcome.reactivateResidentId != null) {
    try {
      await reactivateCitizenAccounts(args.villageId, [outcome.reactivateResidentId]);
    } catch (e) {
      console.error("[mutasi] gagal mengaktifkan lagi akun mobile:", e instanceof Error ? e.message : e);
    }
  }
  return { ok: true, data: outcome };
}
