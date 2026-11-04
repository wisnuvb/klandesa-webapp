/**
 * "Pecah KK" sisi server: pemeriksaan (tanpa menulis) dan penerapan atomik, berdasarkan NOMOR KK (jalur lama Data KK
 * juga memakai nomor KK, sehingga bekerja di desa yang belum mengaktifkan Kependudukan v2).
 * Satu transaksi: semua anggota yang dipilih pindah ke KK baru dan kepala baru KK lama (bila perlu) ditetapkan — atau
 * tidak ada yang berubah sama sekali. Bila Kependudukan v2 aktif, satu catatan Buku Mutasi "Perubahan KK" (APPLIED,
 * via "pecah-kk") dibuat per anggota dan rumah tangga disinkronkan sesudah commit (sama seperti wizard Tambah Keluarga).
 *
 * Izin (residents:update) dijaga oleh pemanggil; ini setara mengubah KK warga lewat penyuntingan langsung.
 */
import { Prisma, type PrismaClient } from "@prisma/client";
import { emitWebhookEvent } from "../webhooks/deliver";
import { KK_HEAD_ROLE, normalizeKk } from "./household";
import { coerceSplitInput, firstIssue, hasSplitIssues, validateSplit, type SplitInput, type SplitIssues, type SplitMember } from "./split";
import { isKependudukanV2, runKependudukanSync, syncResidents } from "./sync";

type Db = Prisma.TransactionClient | PrismaClient;

export interface SplitCheck {
  input: SplitInput;
  issues: SplitIssues;
  sourceKk: string;
  blocking: boolean;
}

export type SplitResult =
  | { ok: true; data: { sourceKk: string; newKk: string; moved: Array<{ id: number; name: string }>; mutations: number; newSourceHeadId: number | null } }
  | { ok: false; status: number; error: string; issues?: SplitIssues };

class Abort extends Error {
  constructor(readonly status: number, readonly msg: string) {
    super(msg);
  }
}

async function loadSource(db: Db, villageId: number, sourceKk: string) {
  const rows = await db.resident.findMany({
    where: { villageId, kk: sourceKk },
    select: { id: true, name: true, familyRole: true, isAlive: true, moveDate: true },
    orderBy: { id: "asc" },
    take: 100,
  });
  if (rows.length === 0) return null;
  const members: SplitMember[] = rows.map((r) => ({ id: r.id, name: r.name, familyRole: r.familyRole, active: r.isAlive && r.moveDate == null }));
  return { members };
}

/** Validasi penuh terhadap keadaan KK sekarang. Tidak menulis apa pun. `null` bila KK atau badan permintaan tidak dikenali. */
export async function checkSplit(db: Db, villageId: number, sourceKkRaw: string, body: unknown, now: Date = new Date()): Promise<SplitCheck | null | "not_found"> {
  const input = coerceSplitInput(body);
  if (!input) return null;
  // KK sumber dipakai apa adanya (maks. 16 karakter): data lama bisa memuat nomor KK yang bukan 16 angka, dan memindahkan
  // anggotanya ke KK baru yang benar justru salah satu kegunaan Pecah KK. Hanya KK BARU yang wajib 16 angka.
  const sourceKk = sourceKkRaw.trim();
  const src = sourceKk && sourceKk.length <= 16 ? await loadSource(db, villageId, sourceKk) : null;
  if (!src) return "not_found";
  const newKk = normalizeKk(input.newKk);
  const taken = newKk && newKk !== sourceKk ? await db.resident.findFirst({ where: { villageId, kk: newKk }, select: { name: true } }) : null;
  const issues = validateSplit(input, { sourceKk, members: src.members, newKkTakenBy: taken?.name ?? null, now });
  return { input, issues, sourceKk, blocking: hasSplitIssues(issues) };
}

export async function splitFamily(
  prisma: PrismaClient,
  args: { village: { id: number; settings: unknown }; userId: number | null; sourceKk: string; body: unknown; now?: Date },
): Promise<SplitResult> {
  const now = args.now ?? new Date();
  const villageId = args.village.id;
  const check = await checkSplit(prisma, villageId, args.sourceKk, args.body, now);
  if (check === "not_found") return { ok: false, status: 404, error: "KK tidak ditemukan." };
  if (!check) return { ok: false, status: 400, error: "Data pecah KK tidak valid." };
  if (check.blocking) return { ok: false, status: 422, error: firstIssue(check.issues), issues: check.issues };

  const { input, sourceKk } = check;
  const newKk = normalizeKk(input.newKk) as string;
  const effective = new Date(`${input.effectiveDate}T00:00:00.000Z`);
  const v2 = isKependudukanV2(args.village.settings);
  const moveIds = input.moves.map((m) => m.residentId);
  const addr = input.address.enabled
    ? { address: input.address.address, rt: input.address.rt || null, rw: input.address.rw || null, hamlet: input.address.hamlet || null }
    : null;

  let moved: Array<{ id: number; name: string }> = [];
  let mutationIds: Array<{ id: bigint; residentId: number }> = [];
  let newSourceHeadId: number | null = null;
  try {
    ({ moved, mutationIds, newSourceHeadId } = await prisma.$transaction(
      async (tx) => {
        // Periksa ulang di dalam transaksi: keadaan bisa berubah sejak pemeriksaan di atas.
        const again = await checkSplit(tx, villageId, args.sourceKk, args.body, now);
        if (!again || again === "not_found") throw new Abort(404, "KK tidak ditemukan.");
        if (again.blocking) throw new Abort(409, `Data keluarga baru saja berubah. ${firstIssue(again.issues)}`);

        const rows = await tx.resident.findMany({
          where: { villageId, id: { in: moveIds }, kk: sourceKk, isAlive: true, moveDate: null },
          select: { id: true, name: true, nik: true, rt: true, rw: true },
        });
        if (rows.length !== moveIds.length) throw new Abort(409, "Ada anggota yang baru saja berubah statusnya. Muat ulang lalu coba lagi.");
        const byId = new Map(rows.map((r) => [r.id, r]));

        const ids: Array<{ id: bigint; residentId: number }> = [];
        for (const mv of input.moves) {
          const r = byId.get(mv.residentId)!;
          const upd = await tx.resident.updateMany({
            where: { id: r.id, villageId, kk: sourceKk, isAlive: true, moveDate: null },
            data: { kk: newKk, familyRole: mv.familyRole, ...(addr ?? {}) },
          });
          if (upd.count !== 1) throw new Abort(409, "Ada anggota yang baru saja berubah. Muat ulang lalu coba lagi.");
          if (!v2) continue;
          const m = await tx.residentMutation.create({
            data: {
              villageId,
              type: "KK_CHANGE",
              status: "APPLIED",
              source: "web",
              effectiveDate: effective,
              residentId: r.id,
              residentName: r.name.slice(0, 255),
              // Tanpa NIK lengkap (sama seperti buku mutasi lain).
              residentNikLast4: r.nik.slice(-4),
              rt: r.rt,
              rw: r.rw,
              householdKk: sourceKk,
              details: { toKk: newKk, newFamilyRole: mv.familyRole, via: "pecah-kk" } satisfies Prisma.InputJsonObject,
              requestedById: args.userId,
              decidedById: args.userId,
              decidedAt: now,
              appliedAt: now,
            },
            select: { id: true },
          });
          ids.push({ id: m.id, residentId: r.id });
        }

        // Kepala lama ikut pindah → tetapkan kepala baru KK lama dari anggota yang tinggal.
        let headId: number | null = null;
        if (input.newSourceHeadId != null) {
          const stillNeeded = await tx.resident.count({ where: { villageId, kk: sourceKk, isAlive: true, moveDate: null, familyRole: KK_HEAD_ROLE } });
          if (stillNeeded === 0) {
            const r = await tx.resident.updateMany({
              where: { id: input.newSourceHeadId, villageId, kk: sourceKk, isAlive: true, moveDate: null },
              data: { familyRole: KK_HEAD_ROLE },
            });
            if (r.count !== 1) throw new Abort(409, "Calon Kepala Keluarga baru untuk KK lama sudah tidak aktif di KK itu.");
            headId = input.newSourceHeadId;
          }
        }
        return { moved: rows.map((r) => ({ id: r.id, name: r.name })), mutationIds: ids, newSourceHeadId: headId };
      },
      { maxWait: 15_000, timeout: 30_000 },
    ));
  } catch (e) {
    if (e instanceof Abort) return { ok: false, status: e.status, error: e.msg };
    throw e;
  }

  for (const m of mutationIds) emitWebhookEvent(villageId, "mutasi.diterapkan", { mutationId: m.id.toString(), type: "KK_CHANGE", residentId: m.residentId });
  const touched = [...moveIds, ...(newSourceHeadId != null ? [newSourceHeadId] : [])];
  await runKependudukanSync(args.village, "pecah-kk", (db) => syncResidents(db, villageId, touched, [sourceKk, newKk]));
  return { ok: true, data: { sourceKk, newKk, moved, mutations: mutationIds.length, newSourceHeadId } };
}
