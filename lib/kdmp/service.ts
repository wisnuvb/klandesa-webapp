import { Prisma, type PrismaClient } from "@prisma/client";
import { fail, invalid, isoDay, type Result } from "@/lib/form-input";
import { fromCents } from "@/lib/coop/loan-math";
import { accountKind } from "@/lib/apbdes/catalog";
import { rulesFor } from "@/lib/dana-desa/rules";
import type { Finding } from "@/lib/dana-desa/compliance";
import { STEPS } from "@/lib/coop/formation";
import { auditOf, entryBrief, parsePayoutChoice, postPayoutEntry, removePayoutEntry, runPayoutTx } from "@/lib/apbdes/payout";
import { KINDS, LIMITS, STATUS } from "./catalog";
import { facilityStatus, kdmpFindings, shareBps, type FacilityFacts } from "./calc";
import { parseDisbursement, parseFacilityCreate, parseFacilityPatch, parseInstallment, parseProgress } from "./schema";

type Db = Prisma.TransactionClient;
const ok = <T>(data: T): { ok: true; data: T } => ({ ok: true, data });
class Stop extends Error {}
const stop = (msg: string): never => {
  throw new Stop(msg);
};
const asResult = (e: unknown): Result<never> => {
  if (e instanceof Stop) return fail(409, e.message);
  throw e;
};
const iso = (d: Date) => d.toISOString().slice(0, 10);
const tomorrowOf = (now: Date) => new Date(now.getTime() + 86_400_000).toISOString().slice(0, 10);
const rp = (c: bigint): string => `Rp${new Intl.NumberFormat("id-ID").format(c / 100n)}`;
const validYear = (y: number): boolean => Number.isInteger(y) && y >= 2000 && y <= 2100;
const docLabel = (version: number): string => (version === 0 ? "APB Desa" : `Perubahan APB Desa ke-${version}`);

/** Pastikan baris pengaturan Dana Desa tahun itu ada; baris ini dipakai sebagai kunci per desa-tahun. */
async function ensureYear(db: PrismaClient, villageId: number, year: number) {
  await db.ddYearSetting.createMany({ data: [{ villageId, year }], skipDuplicates: true });
}
/** Kunci desa-tahun. HARUS pernyataan pertama dalam transaksi (MySQL REPEATABLE READ). */
async function lockYear(tx: Db, villageId: number, year: number) {
  const rows = await tx.$queryRaw<{ id: number }[]>`SELECT id FROM dd_year_settings WHERE villageId = ${villageId} AND year = ${year} FOR UPDATE`;
  // Tanpa baris, FOR UPDATE hanya mengunci celah dan tidak menserialkan penulis: lebih baik berhenti.
  if (!rows.length) stop("Data tahun anggaran belum siap. Muat ulang halaman lalu coba lagi.");
}

export interface Overview {
  year: number;
  rules: { basisYear: number; exact: boolean; sharePct: number };
  pagu: { kdmp: string | null; regular: string | null; sharePct: number | null };
  totals: { received: string; paid: string; balance: string; budgeted: string | null; receivedBps: number | null; paidBps: number | null };
  apbdes: { id: number; version: number; label: string; status: string } | null;
  cooperative: { name: string; stepsDone: number; stepsTotal: number; nextStep: string | null } | null;
  disbursements: { id: number; receivedOn: string; amount: string; reference: string | null; note: string | null }[];
  installments: { id: number; paidOn: string; amount: string; payee: string; reference: string | null; note: string | null; facilityId: number | null; facilityName: string | null; bkuEntryId: number | null; bkuVoucher: string | null }[];
  facilities: { id: number; kind: string; kindLabel: string; name: string; location: string | null; contract: string | null; paid: string; paidBps: number | null; progressPct: number; progressOn: string | null; operatingOn: string | null; status: string; statusLabel: string; note: string | null }[];
  findings: Finding[];
  kinds: Record<string, string>;
}

export async function getOverview(db: Db, args: { villageId: number; year: number; today: string }): Promise<Result<Overview>> {
  const { villageId, year } = args;
  if (!validYear(year)) return fail(400, "Tahun tidak valid.");
  const { rules, exact } = rulesFor(year);
  const [setting, disb, inst, facs, doc, tags, coop] = await Promise.all([
    db.ddYearSetting.findUnique({ where: { villageId_year: { villageId, year } }, select: { regularCents: true, kdmpCents: true } }),
    db.kdmpDisbursement.findMany({ where: { villageId, year }, orderBy: [{ receivedOn: "desc" }, { id: "desc" }], take: LIMITS.disbursementsPerYear }),
    db.kdmpInstallment.findMany({ where: { villageId, year }, orderBy: [{ paidOn: "desc" }, { id: "desc" }], take: LIMITS.installmentsPerYear }),
    db.kdmpFacility.findMany({ where: { villageId, year }, orderBy: { id: "asc" }, take: LIMITS.facilitiesPerYear }),
    db.apbdesDocument.findFirst({ where: { villageId, year }, orderBy: { version: "desc" }, select: { id: true, version: true, status: true } }),
    db.ddFocusTag.findMany({ where: { villageId, year, focus: "KDMP" }, select: { activityCode: true } }),
    db.cooperative.findUnique({ where: { villageId }, select: { name: true, formation: true } }),
  ]);
  const [received, paid] = await Promise.all([
    db.kdmpDisbursement.aggregate({ where: { villageId, year }, _sum: { amountCents: true } }),
    db.kdmpInstallment.aggregate({ where: { villageId, year }, _sum: { amountCents: true } }),
  ]);
  const receivedCents = received._sum.amountCents ?? 0n;
  const paidCents = paid._sum.amountCents ?? 0n;

  let budgetedCents: bigint | null = null;
  if (doc) {
    const codes = new Set(tags.map((t) => t.activityCode));
    const lines = codes.size ? await db.apbdesLine.findMany({ where: { documentId: doc.id, villageId, fundSource: "DD", activityCode: { in: [...codes] } }, select: { accountCode: true, amountCents: true } }) : [];
    budgetedCents = lines.filter((l) => accountKind(l.accountCode) === "BELANJA").reduce((t, l) => t + l.amountCents, 0n);
  }

  const paidBy = new Map<number, bigint>();
  let unassigned = 0n;
  const allInst = await db.kdmpInstallment.groupBy({ by: ["facilityId"], where: { villageId, year }, _sum: { amountCents: true } });
  for (const g of allInst) {
    if (g.facilityId === null) unassigned += g._sum.amountCents ?? 0n;
    else paidBy.set(g.facilityId, g._sum.amountCents ?? 0n);
  }
  const facts: FacilityFacts[] = facs.map((f) => ({ id: f.id, name: f.name, contractCents: f.contractCents, paidCents: paidBy.get(f.id) ?? 0n, progressPct: f.progressPct, progressOn: isoDay(f.progressOn), operatingOn: isoDay(f.operatingOn) }));
  const findings = kdmpFindings({ ruleShareBps: rules.kdmpShareBps, kdmpPaguCents: setting?.kdmpCents ?? null, regularPaguCents: setting?.regularCents ?? null, receivedCents, paidCents, budgetedCents, facilities: facts, unassignedPaidCents: unassigned, today: args.today });

  const names = new Map(facs.map((f) => [f.id, f.name]));
  const brief = await entryBrief(db, villageId, inst.flatMap((i) => (i.bkuEntryId ? [i.bkuEntryId] : [])));
  const kdmp = setting?.kdmpCents ?? null;
  const reg = setting?.regularCents ?? null;
  const steps = coop?.formation ? STEPS.filter((s) => s.done(coop.formation!)) : [];
  const next = coop ? (STEPS.find((s) => !coop.formation || !s.done(coop.formation))?.label ?? null) : null;

  return ok<Overview>({
    year,
    rules: { basisYear: rules.year, exact, sharePct: rules.kdmpShareBps / 100 },
    pagu: { kdmp: kdmp === null ? null : fromCents(kdmp), regular: reg === null ? null : fromCents(reg), sharePct: kdmp !== null && reg !== null && kdmp + reg > 0n ? shareBps(kdmp, kdmp + reg) / 100 : null },
    totals: { received: fromCents(receivedCents), paid: fromCents(paidCents), balance: fromCents(receivedCents - paidCents), budgeted: budgetedCents === null ? null : fromCents(budgetedCents), receivedBps: kdmp ? shareBps(receivedCents, kdmp) : null, paidBps: receivedCents > 0n ? shareBps(paidCents, receivedCents) : null },
    apbdes: doc ? { id: doc.id, version: doc.version, label: docLabel(doc.version), status: doc.status } : null,
    cooperative: coop ? { name: coop.name, stepsDone: steps.length, stepsTotal: STEPS.length, nextStep: next } : null,
    disbursements: disb.map((d) => ({ id: d.id, receivedOn: iso(d.receivedOn), amount: fromCents(d.amountCents), reference: d.reference, note: d.note })),
    installments: inst.map((i) => ({ id: i.id, paidOn: iso(i.paidOn), amount: fromCents(i.amountCents), payee: i.payee, reference: i.reference, note: i.note, facilityId: i.facilityId, facilityName: i.facilityId ? (names.get(i.facilityId) ?? null) : null, bkuEntryId: i.bkuEntryId, bkuVoucher: i.bkuEntryId ? (brief.get(i.bkuEntryId)?.voucherNo ?? null) : null })),
    facilities: facs.map((f) => {
      const p = paidBy.get(f.id) ?? 0n;
      const st = facilityStatus(f.progressPct, isoDay(f.operatingOn));
      return { id: f.id, kind: f.kind, kindLabel: KINDS[f.kind as keyof typeof KINDS] ?? f.kind, name: f.name, location: f.location, contract: f.contractCents === null ? null : fromCents(f.contractCents), paid: fromCents(p), paidBps: f.contractCents ? shareBps(p, f.contractCents) : null, progressPct: f.progressPct, progressOn: isoDay(f.progressOn), operatingOn: isoDay(f.operatingOn), status: st, statusLabel: STATUS[st], note: f.note };
    }),
    findings,
    kinds: KINDS,
  });
}

export async function addDisbursement(db: PrismaClient, args: { villageId: number; userId: number | null; input: unknown; now?: Date }): Promise<Result<{ id: number; year: number; amount: string; reference: string | null }>> {
  const p = parseDisbursement(args.input);
  if (!p.ok) return invalid(p);
  const v = p.value;
  if (iso(v.receivedOn) > tomorrowOf(args.now ?? new Date())) return invalid({ errors: ["Tanggal penerimaan tidak boleh di masa depan."], fieldErrors: { receivedOn: "Tidak boleh di masa depan" } });
  await ensureYear(db, args.villageId, v.year);
  return db
    .$transaction(async (tx) => {
      await lockYear(tx, args.villageId, v.year);
      if ((await tx.kdmpDisbursement.count({ where: { villageId: args.villageId, year: v.year } })) >= LIMITS.disbursementsPerYear) return stop(`Catatan penyaluran maksimal ${LIMITS.disbursementsPerYear} per tahun.`);
      const row = await tx.kdmpDisbursement.create({ data: { villageId: args.villageId, year: v.year, receivedOn: v.receivedOn, amountCents: v.amountCents, reference: v.reference, note: v.note, createdById: args.userId } });
      return ok({ id: row.id, year: v.year, amount: fromCents(v.amountCents), reference: v.reference });
    })
    .catch(asResult);
}

/** Menghapus catatan penyaluran (koreksi salah input). Tidak boleh membuat angsuran melebihi dana yang diterima. */
export async function removeDisbursement(db: PrismaClient, args: { villageId: number; id: number }): Promise<Result<{ year: number; amount: string; reference: string | null }>> {
  const head = await db.kdmpDisbursement.findFirst({ where: { id: args.id, villageId: args.villageId }, select: { year: true } });
  if (!head) return fail(404, "Catatan penyaluran tidak ditemukan.");
  return db
    .$transaction(async (tx) => {
      await lockYear(tx, args.villageId, head.year);
      const row = await tx.kdmpDisbursement.findFirst({ where: { id: args.id, villageId: args.villageId } });
      if (!row) return fail(404, "Catatan penyaluran tidak ditemukan.");
      const [rec, paid] = await Promise.all([
        tx.kdmpDisbursement.aggregate({ where: { villageId: args.villageId, year: row.year }, _sum: { amountCents: true } }),
        tx.kdmpInstallment.aggregate({ where: { villageId: args.villageId, year: row.year }, _sum: { amountCents: true } }),
      ]);
      const after = (rec._sum.amountCents ?? 0n) - row.amountCents;
      if (after < (paid._sum.amountCents ?? 0n)) return stop(`Tidak dapat dihapus: angsuran tercatat (${rp(paid._sum.amountCents ?? 0n)}) akan melebihi dana yang diterima (${rp(after)}). Hapus atau koreksi angsuran terlebih dahulu.`);
      await tx.kdmpDisbursement.delete({ where: { id: row.id } });
      return ok({ year: row.year, amount: fromCents(row.amountCents), reference: row.reference });
    })
    .catch(asResult);
}

export async function addInstallment(db: PrismaClient, args: { villageId: number; userId: number | null; input: unknown; now?: Date }): Promise<Result<{ id: number; year: number; amount: string; facilityId: number | null; payee: string; reference: string | null }>> {
  const p = parseInstallment(args.input);
  if (!p.ok) return invalid(p);
  const v = p.value;
  if (iso(v.paidOn) > tomorrowOf(args.now ?? new Date())) return invalid({ errors: ["Tanggal pembayaran tidak boleh di masa depan."], fieldErrors: { paidOn: "Tidak boleh di masa depan" } });
  await ensureYear(db, args.villageId, v.year);
  return db
    .$transaction(async (tx) => {
      await lockYear(tx, args.villageId, v.year);
      if ((await tx.kdmpInstallment.count({ where: { villageId: args.villageId, year: v.year } })) >= LIMITS.installmentsPerYear) return stop(`Catatan angsuran maksimal ${LIMITS.installmentsPerYear} per tahun.`);
      if (v.facilityId) {
        const fac = await tx.kdmpFacility.findFirst({ where: { id: v.facilityId, villageId: args.villageId, year: v.year } });
        if (!fac) return fail(404, "Gerai/gudang tidak ditemukan pada tahun ini.");
        if (fac.contractCents !== null) {
          const sum = await tx.kdmpInstallment.aggregate({ where: { facilityId: fac.id }, _sum: { amountCents: true } });
          if ((sum._sum.amountCents ?? 0n) + v.amountCents > fac.contractCents) return stop(`Angsuran akan melebihi nilai pekerjaan ${fac.name} (${rp(fac.contractCents)}). Koreksi nilai pekerjaan bila ada perubahan kontrak.`);
        }
      }
      const [rec, paid] = await Promise.all([
        tx.kdmpDisbursement.aggregate({ where: { villageId: args.villageId, year: v.year }, _sum: { amountCents: true } }),
        tx.kdmpInstallment.aggregate({ where: { villageId: args.villageId, year: v.year }, _sum: { amountCents: true } }),
      ]);
      const received = rec._sum.amountCents ?? 0n;
      const already = paid._sum.amountCents ?? 0n;
      if (already + v.amountCents > received) return stop(`Angsuran melebihi dana KDMP yang diterima. Diterima ${rp(received)}, sudah diangsur ${rp(already)}. Catat penyaluran dana terlebih dahulu.`);
      const row = await tx.kdmpInstallment.create({ data: { villageId: args.villageId, year: v.year, facilityId: v.facilityId, paidOn: v.paidOn, amountCents: v.amountCents, payee: v.payee, reference: v.reference, note: v.note, createdById: args.userId } });
      return ok({ id: row.id, year: v.year, amount: fromCents(v.amountCents), facilityId: v.facilityId, payee: v.payee, reference: v.reference });
    })
    .catch(asResult);
}

export async function removeInstallment(db: PrismaClient, args: { villageId: number; id: number }): Promise<Result<{ year: number; amount: string; payee: string; reference: string | null }>> {
  const row = await db.kdmpInstallment.findFirst({ where: { id: args.id, villageId: args.villageId } });
  if (!row) return fail(404, "Catatan angsuran tidak ditemukan.");
  if (row.bkuEntryId !== null) return fail(409, "Angsuran ini sudah dicatat di Buku Kas Umum. Batalkan pencatatan Buku Kas Umum lebih dulu.");
  // bkuEntryId IS NULL dalam penghapusan: bila tertaut tepat setelah pembacaan di atas, penghapusan tidak terjadi.
  const r = await db.kdmpInstallment.deleteMany({ where: { id: row.id, villageId: args.villageId, bkuEntryId: null } });
  return r.count ? ok({ year: row.year, amount: fromCents(row.amountCents), payee: row.payee, reference: row.reference }) : fail(404, "Catatan angsuran tidak ditemukan.");
}

export async function createFacility(db: PrismaClient, args: { villageId: number; userId: number | null; input: unknown }): Promise<Result<{ id: number; year: number; kind: string; name: string; contract: string | null }>> {
  const p = parseFacilityCreate(args.input);
  if (!p.ok) return invalid(p);
  const v = p.value;
  await ensureYear(db, args.villageId, v.year);
  return db
    .$transaction(async (tx) => {
      await lockYear(tx, args.villageId, v.year);
      if ((await tx.kdmpFacility.count({ where: { villageId: args.villageId, year: v.year } })) >= LIMITS.facilitiesPerYear) return stop(`Daftar gerai/gudang maksimal ${LIMITS.facilitiesPerYear} per tahun.`);
      const row = await tx.kdmpFacility.create({ data: { villageId: args.villageId, year: v.year, kind: v.kind, name: v.name, location: v.location, contractCents: v.contractCents, note: v.note, createdById: args.userId } });
      return ok({ id: row.id, year: v.year, kind: v.kind, name: v.name, contract: v.contractCents === null ? null : fromCents(v.contractCents) });
    })
    .catch(asResult);
}

async function loadFacility(tx: Db, villageId: number, id: number) {
  const head = await tx.kdmpFacility.findFirst({ where: { id, villageId }, select: { year: true } });
  return head;
}

export async function patchFacility(db: PrismaClient, args: { villageId: number; id: number; input: unknown; now?: Date }): Promise<Result<{ before: Record<string, unknown>; after: Record<string, unknown> }>> {
  const p = parseFacilityPatch(args.input);
  if (!p.ok) return invalid(p);
  const v = p.value;
  const head = await loadFacility(db, args.villageId, args.id);
  if (!head) return fail(404, "Gerai/gudang tidak ditemukan.");
  return db
    .$transaction(async (tx) => {
      await lockYear(tx, args.villageId, head.year);
      const cur = await tx.kdmpFacility.findFirst({ where: { id: args.id, villageId: args.villageId } });
      if (!cur) return fail(404, "Gerai/gudang tidak ditemukan.");
      if (v.contractCents !== undefined) {
        const sum = await tx.kdmpInstallment.aggregate({ where: { facilityId: cur.id }, _sum: { amountCents: true } });
        const paid = sum._sum.amountCents ?? 0n;
        if (v.contractCents === null && paid > 0n) return stop("Nilai pekerjaan tidak dapat dikosongkan karena sudah ada angsuran yang dikaitkan.");
        if (v.contractCents !== null && paid > v.contractCents) return stop(`Nilai pekerjaan tidak boleh di bawah angsuran yang sudah dibayar (${rp(paid)}).`);
      }
      if (v.operatingOn) {
        if (cur.progressPct < 100) return invalid({ errors: ["Baru dapat ditandai beroperasi setelah progres fisik 100%."], fieldErrors: { operatingOn: "Progres fisik masih di bawah 100%, belum dapat ditandai beroperasi." } });
        if (iso(v.operatingOn) > tomorrowOf(args.now ?? new Date())) return invalid({ errors: ["Tanggal beroperasi tidak boleh di masa depan."], fieldErrors: { operatingOn: "Tidak boleh di masa depan" } });
      }
      const before = { kind: cur.kind, name: cur.name, contract: cur.contractCents === null ? null : fromCents(cur.contractCents), operatingOn: isoDay(cur.operatingOn) };
      await tx.kdmpFacility.update({ where: { id: cur.id }, data: v });
      const after = { kind: v.kind ?? cur.kind, name: v.name ?? cur.name, contract: v.contractCents === undefined ? before.contract : v.contractCents === null ? null : fromCents(v.contractCents), operatingOn: v.operatingOn === undefined ? before.operatingOn : isoDay(v.operatingOn) };
      return ok({ before, after });
    })
    .catch(asResult);
}

/** Menghapus gerai/gudang yang belum punya angsuran; riwayat progresnya ikut terhapus. */
export async function deleteFacility(db: PrismaClient, args: { villageId: number; id: number }): Promise<Result<{ year: number; name: string; contract: string | null; progressRecords: number }>> {
  const head = await loadFacility(db, args.villageId, args.id);
  if (!head) return fail(404, "Gerai/gudang tidak ditemukan.");
  return db
    .$transaction(async (tx) => {
      await lockYear(tx, args.villageId, head.year);
      const cur = await tx.kdmpFacility.findFirst({ where: { id: args.id, villageId: args.villageId } });
      if (!cur) return fail(404, "Gerai/gudang tidak ditemukan.");
      if (await tx.kdmpInstallment.count({ where: { facilityId: cur.id } })) return stop("Masih ada angsuran yang dikaitkan. Hapus atau koreksi angsurannya terlebih dahulu.");
      const progressRecords = await tx.kdmpFacilityProgress.count({ where: { facilityId: cur.id } });
      await tx.kdmpFacility.delete({ where: { id: cur.id } });
      return ok({ year: cur.year, name: cur.name, contract: cur.contractCents === null ? null : fromCents(cur.contractCents), progressRecords });
    })
    .catch(asResult);
}

async function syncProgress(tx: Db, facilityId: number) {
  const latest = await tx.kdmpFacilityProgress.findFirst({ where: { facilityId }, orderBy: [{ recordedOn: "desc" }, { id: "desc" }] });
  await tx.kdmpFacility.update({ where: { id: facilityId }, data: { progressPct: latest?.progressPct ?? 0, progressOn: latest?.recordedOn ?? null } });
  return latest?.progressPct ?? 0;
}

/** Mencatat progres fisik. Progres tidak boleh turun menurut urutan tanggal; koreksi dengan menghapus catatan yang salah. */
export async function addProgress(db: PrismaClient, args: { villageId: number; id: number; userId: number | null; input: unknown; now?: Date }): Promise<Result<{ progressPct: number; recordId: number; recordedOn: string }>> {
  const p = parseProgress(args.input);
  if (!p.ok) return invalid(p);
  const v = p.value;
  if (iso(v.recordedOn) > tomorrowOf(args.now ?? new Date())) return invalid({ errors: ["Tanggal pencatatan tidak boleh di masa depan."], fieldErrors: { recordedOn: "Tidak boleh di masa depan" } });
  const head = await loadFacility(db, args.villageId, args.id);
  if (!head) return fail(404, "Gerai/gudang tidak ditemukan.");
  return db
    .$transaction(async (tx) => {
      await lockYear(tx, args.villageId, head.year);
      const cur = await tx.kdmpFacility.findFirst({ where: { id: args.id, villageId: args.villageId } });
      if (!cur) return fail(404, "Gerai/gudang tidak ditemukan.");
      if (cur.operatingOn && v.progressPct < 100) return stop("Sudah ditandai beroperasi; progres tidak dapat diturunkan.");
      if ((await tx.kdmpFacilityProgress.count({ where: { facilityId: cur.id } })) >= LIMITS.progressPerFacility) return stop(`Riwayat progres maksimal ${LIMITS.progressPerFacility} catatan per gerai/gudang.`);
      const [before, after] = await Promise.all([
        tx.kdmpFacilityProgress.aggregate({ where: { facilityId: cur.id, recordedOn: { lte: v.recordedOn } }, _max: { progressPct: true } }),
        tx.kdmpFacilityProgress.aggregate({ where: { facilityId: cur.id, recordedOn: { gt: v.recordedOn } }, _min: { progressPct: true } }),
      ]);
      if (before._max.progressPct !== null && v.progressPct < before._max.progressPct) return stop(`Progres tidak boleh lebih rendah dari catatan sebelumnya (${before._max.progressPct}%). Hapus catatan yang salah bila perlu.`);
      if (after._min.progressPct !== null && v.progressPct > after._min.progressPct) return stop(`Progres tidak boleh lebih tinggi dari catatan sesudahnya (${after._min.progressPct}%).`);
      const rec = await tx.kdmpFacilityProgress.create({ data: { facilityId: cur.id, villageId: args.villageId, recordedOn: v.recordedOn, progressPct: v.progressPct, note: v.note, createdById: args.userId } });
      return ok({ progressPct: await syncProgress(tx, cur.id), recordId: rec.id, recordedOn: iso(v.recordedOn) });
    })
    .catch(asResult);
}

export interface ProgressRow {
  id: number;
  recordedOn: string;
  progressPct: number;
  note: string | null;
}
export async function listProgress(db: Db, args: { villageId: number; id: number }): Promise<Result<{ name: string; rows: ProgressRow[] }>> {
  const fac = await db.kdmpFacility.findFirst({ where: { id: args.id, villageId: args.villageId }, select: { name: true } });
  if (!fac) return fail(404, "Gerai/gudang tidak ditemukan.");
  const rows = await db.kdmpFacilityProgress.findMany({ where: { facilityId: args.id }, orderBy: [{ recordedOn: "desc" }, { id: "desc" }], take: LIMITS.progressPerFacility });
  return ok({ name: fac.name, rows: rows.map((r) => ({ id: r.id, recordedOn: iso(r.recordedOn), progressPct: r.progressPct, note: r.note })) });
}

export async function removeProgress(db: PrismaClient, args: { villageId: number; id: number; progressId: number }): Promise<Result<{ progressPct: number; removed: { recordedOn: string; progressPct: number } }>> {
  const head = await loadFacility(db, args.villageId, args.id);
  if (!head) return fail(404, "Gerai/gudang tidak ditemukan.");
  return db
    .$transaction(async (tx) => {
      await lockYear(tx, args.villageId, head.year);
      const cur = await tx.kdmpFacility.findFirst({ where: { id: args.id, villageId: args.villageId } });
      if (!cur) return fail(404, "Gerai/gudang tidak ditemukan.");
      const row = await tx.kdmpFacilityProgress.findFirst({ where: { id: args.progressId, facilityId: cur.id } });
      if (!row) return fail(404, "Catatan progres tidak ditemukan.");
      if (cur.operatingOn) {
        const rest = await tx.kdmpFacilityProgress.aggregate({ where: { facilityId: cur.id, NOT: { id: row.id } }, _max: { progressPct: true } });
        if ((rest._max.progressPct ?? 0) < 100) return stop("Sudah ditandai beroperasi; hapus tanggal beroperasi dahulu sebelum menghapus catatan progres 100%.");
      }
      await tx.kdmpFacilityProgress.delete({ where: { id: row.id } });
      return ok({ progressPct: await syncProgress(tx, cur.id), removed: { recordedOn: iso(row.recordedOn), progressPct: row.progressPct } });
    })
    .catch(asResult);
}

// ---- Tautan ke Buku Kas Umum

const lockInstallment = (villageId: number, id: number) => async (tx: Prisma.TransactionClient) => {
  await tx.$queryRaw`SELECT id FROM kdmp_installments WHERE id = ${id} AND villageId = ${villageId} FOR UPDATE`;
};

/** Mencatat satu angsuran ke Buku Kas Umum sebagai pengeluaran pada tanggal bayar. Body: kegiatan, rekening, kas, nomor bukti. */
export async function postInstallmentToBku(db: PrismaClient, args: { villageId: number; userId: number | null; id: number; input: unknown; now?: Date }): Promise<Result<{ entryId: number; voucherNo: string; amount: string; activityCode: string | null; accountCode: string | null; channel: string; paidOn: string }>> {
  const p = parsePayoutChoice(args.input);
  if (!p.ok) return invalid(p);
  const head = await db.kdmpInstallment.findFirst({ where: { id: args.id, villageId: args.villageId }, select: { paidOn: true } });
  if (!head) return fail(404, "Catatan angsuran tidak ditemukan.");
  return runPayoutTx(db, {
    villageId: args.villageId,
    year: head.paidOn.getUTCFullYear(),
    lockModule: lockInstallment(args.villageId, args.id),
    fn: async (tx) => {
      const row = await tx.kdmpInstallment.findFirst({ where: { id: args.id, villageId: args.villageId }, include: { facility: { select: { name: true } } } });
      if (!row) return fail(404, "Catatan angsuran tidak ditemukan.");
      if (row.bkuEntryId !== null) return fail(409, "Angsuran ini sudah dicatat di Buku Kas Umum.");
      const desc = `Angsuran dukungan KDMP kepada ${row.payee}${row.facility ? ` (${row.facility.name})` : ""}${row.reference ? `, ${row.reference}` : ""}`;
      const r = await postPayoutEntry(tx, { villageId: args.villageId, userId: args.userId, year: row.paidOn.getUTCFullYear(), entryDate: row.paidOn, choice: p.value, description: desc, amountCents: row.amountCents, now: args.now });
      if (!r.ok) return r;
      await tx.kdmpInstallment.update({ where: { id: row.id }, data: { bkuEntryId: r.data.id } });
      return ok({ entryId: r.data.id, voucherNo: r.data.voucherNo, amount: fromCents(row.amountCents), ...auditOf(p.value, row.paidOn) });
    },
  });
}

/** Membatalkan pencatatan Buku Kas Umum suatu angsuran (menghapus catatan kas yang dibuat darinya). */
export async function unpostInstallmentFromBku(db: PrismaClient, args: { villageId: number; id: number }): Promise<Result<{ entryId: number; voucherNo: string; amount: string; activityCode: string | null; accountCode: string | null; channel: string; paidOn: string }>> {
  const head = await db.kdmpInstallment.findFirst({ where: { id: args.id, villageId: args.villageId }, select: { bkuEntryId: true, bkuEntry: { select: { year: true } } } });
  if (!head) return fail(404, "Catatan angsuran tidak ditemukan.");
  if (head.bkuEntryId === null || !head.bkuEntry) return fail(409, "Angsuran ini belum dicatat di Buku Kas Umum.");
  return runPayoutTx(db, {
    villageId: args.villageId,
    year: head.bkuEntry.year,
    lockModule: lockInstallment(args.villageId, args.id),
    fn: async (tx) => {
      const row = await tx.kdmpInstallment.findFirst({ where: { id: args.id, villageId: args.villageId }, include: { bkuEntry: { select: { voucherNo: true, activityCode: true, accountCode: true, channel: true, entryDate: true } } } });
      if (!row) return fail(404, "Catatan angsuran tidak ditemukan.");
      if (row.bkuEntryId === null) return fail(409, "Angsuran ini belum dicatat di Buku Kas Umum.");
      const entryId = row.bkuEntryId;
      const r = await removePayoutEntry(tx, args.villageId, entryId);
      if (!r.ok) return r;
      return ok({ entryId, voucherNo: row.bkuEntry?.voucherNo ?? "", amount: fromCents(row.amountCents), activityCode: row.bkuEntry?.activityCode ?? null, accountCode: row.bkuEntry?.accountCode ?? null, channel: row.bkuEntry?.channel ?? "", paidOn: row.bkuEntry?.entryDate.toISOString().slice(0, 10) ?? "" });
    },
  });
}
