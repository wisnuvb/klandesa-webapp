import { Prisma, type PrismaClient } from "@prisma/client";
import { fail, invalid, isoDay, type Result } from "@/lib/form-input";
import { fromCents } from "@/lib/coop/loan-math";
import { kegiatanName } from "@/lib/apbdes/catalog";
import { rulesFor } from "@/lib/dana-desa/rules";
import { fundingOf, pickFunding, requestFunding, type FundingView } from "@/lib/apbdes/funding";
import { LIMITS, PRIORITIES, STATUS, TASKS } from "./catalog";
import { activityWarnings, shareBps, wageProblem } from "./calc";
import { parseActivityCreate, parseActivityPatch, parseDays, parsePay, parseWorker } from "./schema";

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

/** Kebutuhan upah yang belum dibayarkan (sen): yang lebih besar antara rencana upah dan upah tercatat, dikurangi upah yang sudah dibayar. */
async function wageNeed(db: Db, activityId: number, plannedWageCents: bigint): Promise<bigint> {
  const [all, paid] = await Promise.all([
    db.pktdWorkDay.aggregate({ where: { activityId }, _sum: { wageCents: true } }),
    db.pktdWorkDay.aggregate({ where: { activityId, paidOn: { not: null } }, _sum: { wageCents: true } }),
  ]);
  const base = (all._sum.wageCents ?? 0n) > plannedWageCents ? (all._sum.wageCents ?? 0n) : plannedWageCents;
  const rest = base - (paid._sum.wageCents ?? 0n);
  return rest > 0n ? rest : 0n;
}

/** Kunci baris kegiatan. HARUS pernyataan pertama dalam transaksi (MySQL REPEATABLE READ). */
async function lockActivity(tx: Db, villageId: number, id: number) {
  const rows = await tx.$queryRaw<{ id: number }[]>`SELECT id FROM pktd_activities WHERE id = ${id} AND villageId = ${villageId} FOR UPDATE`;
  if (!rows.length) return null;
  return tx.pktdActivity.findFirstOrThrow({ where: { id, villageId } });
}

export interface ActivityListItem {
  id: number;
  year: number;
  title: string;
  location: string | null;
  status: string;
  statusLabel: string;
  cost: string;
  plannedShareBps: number;
  recordedWage: string;
  recordedShareBps: number;
  workers: number;
  workDays: number;
  unpaidDays: number;
}

export async function listActivities(db: Db, villageId: number, year: number): Promise<ActivityListItem[]> {
  const acts = await db.pktdActivity.findMany({ where: { villageId, year }, orderBy: { id: "desc" } });
  if (!acts.length) return [];
  const ids = acts.map((a) => a.id);
  const [days, unpaid, workers] = await Promise.all([
    db.pktdWorkDay.groupBy({ by: ["activityId"], where: { activityId: { in: ids } }, _sum: { wageCents: true }, _count: { _all: true } }),
    db.pktdWorkDay.groupBy({ by: ["activityId"], where: { activityId: { in: ids }, paidOn: null }, _count: { _all: true } }),
    db.pktdWorker.groupBy({ by: ["activityId"], where: { activityId: { in: ids } }, _count: { _all: true } }),
  ]);
  return acts.map((a) => {
    const d = days.find((x) => x.activityId === a.id);
    const wage = d?._sum.wageCents ?? 0n;
    return {
      id: a.id,
      year: a.year,
      title: a.title,
      location: a.location,
      status: a.status,
      statusLabel: STATUS[a.status as keyof typeof STATUS] ?? a.status,
      cost: fromCents(a.costCents),
      plannedShareBps: shareBps(a.plannedWageCents, a.costCents),
      recordedWage: fromCents(wage),
      recordedShareBps: shareBps(wage, a.costCents),
      workers: workers.find((x) => x.activityId === a.id)?._count._all ?? 0,
      workDays: d?._count._all ?? 0,
      unpaidDays: unpaid.find((x) => x.activityId === a.id)?._count._all ?? 0,
    };
  });
}

export interface WorkerView {
  id: number;
  name: string;
  gender: string | null;
  priority: string;
  priorityLabel: string;
  isPriority: boolean;
  days: number;
  totalWage: string;
  unpaidDays: number;
}
export interface DayGroup {
  date: string;
  count: number;
  total: string;
  unpaid: number;
}
export interface ActivityView {
  id: number;
  year: number;
  activityCode: string | null;
  activityName: string | null;
  title: string;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  cost: string;
  plannedWage: string;
  plannedShareBps: number;
  recordedWage: string;
  recordedShareBps: number;
  paidWage: string;
  wageMin: string | null;
  wageMax: string | null;
  wageBasis: string | null;
  status: string;
  statusLabel: string;
  note: string | null;
  minPct: number;
  apbdesBudget: string | null;
  workers: WorkerView[];
  dayGroups: DayGroup[];
  /** SPP yang mendanai upah kegiatan ini (upah baru hanya dapat dibayarkan dari SPP yang sudah dibayar) */
  funding: FundingView;
  stats: { workers: number; women: number; priorityWorkers: number; workDays: number };
  warnings: { level: "ERROR" | "WARN" | "INFO"; message: string }[];
  terms: { priorities: { key: string; label: string }[]; tasks: Record<string, string> };
}

export async function getActivity(db: Db, villageId: number, id: number): Promise<Result<ActivityView>> {
  const a = await db.pktdActivity.findFirst({ where: { id, villageId }, include: { workers: { orderBy: { id: "asc" } } } });
  if (!a) return fail(404, "Kegiatan PKTD tidak ditemukan.");
  const { rules } = rulesFor(a.year);
  // Agregasi di SQL: jumlah baris hari kerja bisa besar (pekerja × tanggal).
  const [perWorker, perWorkerUnpaid, perDate, perDateUnpaid, totals, paidTotals, unpaidCount] = await Promise.all([
    db.pktdWorkDay.groupBy({ by: ["workerId"], where: { activityId: a.id }, _count: { _all: true }, _sum: { wageCents: true } }),
    db.pktdWorkDay.groupBy({ by: ["workerId"], where: { activityId: a.id, paidOn: null }, _count: { _all: true } }),
    db.pktdWorkDay.groupBy({ by: ["workDate"], where: { activityId: a.id }, _count: { _all: true }, _sum: { wageCents: true }, orderBy: { workDate: "desc" }, take: 90 }),
    db.pktdWorkDay.groupBy({ by: ["workDate"], where: { activityId: a.id, paidOn: null }, _count: { _all: true } }),
    db.pktdWorkDay.aggregate({ where: { activityId: a.id }, _sum: { wageCents: true }, _count: { _all: true } }),
    db.pktdWorkDay.aggregate({ where: { activityId: a.id, paidOn: { not: null } }, _sum: { wageCents: true } }),
    db.pktdWorkDay.count({ where: { activityId: a.id, paidOn: null } }),
  ]);
  const recorded = totals._sum.wageCents ?? 0n;
  const paid = paidTotals._sum.wageCents ?? 0n;
  const unpaidDays = unpaidCount;
  const workers = a.workers.map((w): WorkerView => {
    const s = perWorker.find((x) => x.workerId === w.id);
    const p = PRIORITIES[w.priority as keyof typeof PRIORITIES];
    return { id: w.id, name: w.name, gender: w.gender, priority: w.priority, priorityLabel: p?.label ?? w.priority, isPriority: Boolean(p?.priority), days: s?._count._all ?? 0, totalWage: fromCents(s?._sum.wageCents ?? 0n), unpaidDays: perWorkerUnpaid.find((x) => x.workerId === w.id)?._count._all ?? 0 };
  });
  let apbdesBudget: string | null = null;
  if (a.activityCode) {
    const doc = await db.apbdesDocument.findFirst({ where: { villageId, year: a.year }, orderBy: { version: "desc" }, select: { id: true } });
    if (doc) {
      const sum = await db.apbdesLine.aggregate({ where: { documentId: doc.id, villageId, activityCode: a.activityCode, accountCode: { startsWith: "5." } }, _sum: { amountCents: true } });
      apbdesBudget = sum._sum.amountCents === null ? null : fromCents(sum._sum.amountCents);
    }
  }
  const funding = await fundingOf(db, villageId, "PKTD", a.id, a.status === "AKTIF" ? await wageNeed(db, a.id, a.plannedWageCents) : 0n);
  const warnings = activityWarnings({ minPct: rules.pktdWageMinPct, costCents: a.costCents, plannedWageCents: a.plannedWageCents, recordedWageCents: recorded, unpaidDays, wageMinCents: a.wageMinCents, wageMaxCents: a.wageMaxCents, workerCount: workers.length, priorityWorkerCount: workers.filter((w) => w.isPriority).length, done: a.status === "SELESAI" });
  return ok<ActivityView>({
    id: a.id,
    year: a.year,
    activityCode: a.activityCode,
    activityName: a.activityCode ? kegiatanName(a.activityCode) : null,
    title: a.title,
    location: a.location,
    startDate: isoDay(a.startDate),
    endDate: isoDay(a.endDate),
    cost: fromCents(a.costCents),
    plannedWage: fromCents(a.plannedWageCents),
    plannedShareBps: shareBps(a.plannedWageCents, a.costCents),
    recordedWage: fromCents(recorded),
    recordedShareBps: shareBps(recorded, a.costCents),
    paidWage: fromCents(paid),
    wageMin: a.wageMinCents === null ? null : fromCents(a.wageMinCents),
    wageMax: a.wageMaxCents === null ? null : fromCents(a.wageMaxCents),
    wageBasis: a.wageBasis,
    status: a.status,
    statusLabel: STATUS[a.status as keyof typeof STATUS] ?? a.status,
    note: a.note,
    minPct: rules.pktdWageMinPct,
    apbdesBudget,
    workers,
    dayGroups: perDate.map((g) => ({ date: iso(g.workDate), count: g._count._all, total: fromCents(g._sum.wageCents ?? 0n), unpaid: perDateUnpaid.find((x) => iso(x.workDate) === iso(g.workDate))?._count._all ?? 0 })),
    funding,
    stats: { workers: workers.length, women: a.workers.filter((w) => w.gender === "P").length, priorityWorkers: workers.filter((w) => w.isPriority).length, workDays: totals._count._all },
    warnings,
    terms: { priorities: (Object.keys(PRIORITIES) as (keyof typeof PRIORITIES)[]).map((key) => ({ key, label: PRIORITIES[key].label })), tasks: { ...TASKS } },
  });
}

// ---- Kegiatan

export async function createActivity(db: PrismaClient, args: { villageId: number; userId: number | null; input: unknown }): Promise<Result<{ id: number }>> {
  const p = parseActivityCreate(args.input);
  if (!p.ok) return invalid(p);
  if ((await db.pktdActivity.count({ where: { villageId: args.villageId, year: p.value.year } })) >= LIMITS.activitiesPerYear) return fail(409, `Kegiatan PKTD maksimal ${LIMITS.activitiesPerYear} per tahun.`);
  const row = await db.pktdActivity.create({ data: { villageId: args.villageId, createdById: args.userId, ...p.value } });
  return ok({ id: row.id });
}

export async function patchActivity(db: PrismaClient, args: { villageId: number; id: number; input: unknown; allowReopen?: boolean }): Promise<Result<{ id: number; before: { cost: string; plannedWage: string; status: string } }>> {
  const p = parseActivityPatch(args.input);
  if (!p.ok) return invalid(p);
  const v = p.value;
  return db
    .$transaction(async (tx) => {
      const cur = await lockActivity(tx, args.villageId, args.id);
      if (!cur) return fail(404, "Kegiatan PKTD tidak ditemukan.");
      const cost = v.costCents ?? cur.costCents;
      if ((v.plannedWageCents ?? cur.plannedWageCents) > cost) return invalid({ errors: ["Rencana upah tidak boleh melebihi total biaya."], fieldErrors: { plannedWage: "Melebihi total biaya" } });
      const min = v.wageMinCents !== undefined ? v.wageMinCents : cur.wageMinCents;
      const max = v.wageMaxCents !== undefined ? v.wageMaxCents : cur.wageMaxCents;
      if (min !== null && max !== null && max < min) return invalid({ errors: ["Batas atas upah tidak boleh di bawah batas bawah."], fieldErrors: { wageMax: "Di bawah batas bawah" } });
      const start = v.startDate !== undefined ? v.startDate : cur.startDate;
      const end = v.endDate !== undefined ? v.endDate : cur.endDate;
      if (start && end && end < start) return invalid({ errors: ["Tanggal selesai tidak boleh sebelum tanggal mulai."], fieldErrors: { endDate: "Sebelum tanggal mulai" } });
      if (cur.status === "SELESAI" && v.status === "AKTIF" && !args.allowReopen) return fail(403, "Hanya admin yang dapat membuka kembali kegiatan yang sudah selesai.");
      if (v.costCents !== undefined) {
        const agg = await tx.pktdWorkDay.aggregate({ where: { activityId: cur.id }, _sum: { wageCents: true } });
        if ((agg._sum.wageCents ?? 0n) > v.costCents) return invalid({ errors: [`Upah yang sudah tercatat (Rp${new Intl.NumberFormat("id-ID").format((agg._sum.wageCents ?? 0n) / 100n)}) melebihi total biaya baru.`], fieldErrors: { cost: "Di bawah upah yang sudah tercatat" } });
      }
      if (cur.status === "SELESAI" && v.status !== "AKTIF" && Object.keys(v).some((k) => k !== "note" && k !== "status")) return fail(409, "Kegiatan sudah selesai; buka kembali untuk mengubah isiannya.");
      // Batas upah baru tidak boleh membuat hari kerja yang sudah tercatat menjadi di luar batas diam-diam.
      if (v.wageMinCents !== undefined || v.wageMaxCents !== undefined) {
        const outside = await tx.pktdWorkDay.count({ where: { activityId: cur.id, OR: [...(min !== null ? [{ wageCents: { lt: min } }] : []), ...(max !== null ? [{ wageCents: { gt: max } }] : [])] } });
        if (outside) return fail(409, `${outside} hari kerja yang sudah tercatat berada di luar batas upah baru. Koreksi catatannya lebih dulu.`);
      }
      await tx.pktdActivity.update({ where: { id: cur.id }, data: v });
      return ok({ id: cur.id, before: { cost: fromCents(cur.costCents), plannedWage: fromCents(cur.plannedWageCents), status: cur.status } });
    })
    .catch(asResult);
}

export async function deleteActivity(db: PrismaClient, args: { villageId: number; id: number }): Promise<Result<{ id: number }>> {
  return db
    .$transaction(async (tx) => {
      const cur = await lockActivity(tx, args.villageId, args.id);
      if (!cur) return fail(404, "Kegiatan PKTD tidak ditemukan.");
      if ((await tx.pktdWorkDay.count({ where: { activityId: cur.id } })) > 0) return fail(409, "Kegiatan sudah memiliki catatan hari kerja dan tidak dapat dihapus.");
      if ((await tx.apbdesPayRequest.count({ where: { villageId: args.villageId, sourceKind: "PKTD", sourceId: cur.id, status: { not: "DITOLAK" } } })) > 0) return fail(409, "Kegiatan ini sudah memiliki SPP yang diajukan atau dibayar. Selesaikan atau kembalikan dana SPP-nya terlebih dahulu.");
      await tx.pktdActivity.delete({ where: { id: cur.id } });
      return ok({ id: cur.id });
    })
    .catch(asResult);
}

// ---- Pekerja

export async function addWorker(db: PrismaClient, args: { villageId: number; activityId: number; input: unknown }): Promise<Result<{ id: number }>> {
  const p = parseWorker(args.input);
  if (!p.ok) return invalid(p);
  const v = p.value;
  return db
    .$transaction(async (tx) => {
      const cur = await lockActivity(tx, args.villageId, args.activityId);
      if (!cur) return fail(404, "Kegiatan PKTD tidak ditemukan.");
      if (cur.status === "SELESAI") return fail(409, "Kegiatan sudah selesai.");
      if ((await tx.pktdWorker.count({ where: { activityId: cur.id } })) >= LIMITS.workersPerActivity) return fail(409, `Pekerja maksimal ${LIMITS.workersPerActivity} per kegiatan.`);
      let name = v.name;
      let gender = v.gender;
      if (v.residentId) {
        const r = await tx.resident.findFirst({ where: { id: v.residentId, villageId: args.villageId }, select: { name: true, gender: true, isAlive: true } });
        if (!r) return stop("Warga tidak ditemukan di Desa ini.");
        if (!r.isAlive) return stop("Warga ini tercatat meninggal.");
        if (await tx.pktdWorker.findFirst({ where: { activityId: cur.id, residentId: v.residentId }, select: { id: true } })) return stop("Warga ini sudah terdaftar sebagai pekerja kegiatan ini.");
        name = r.name;
        gender = gender ?? (/^p/i.test(r.gender) ? "P" : /^l/i.test(r.gender) ? "L" : null);
      }
      const row = await tx.pktdWorker.create({ data: { activityId: cur.id, villageId: args.villageId, residentId: v.residentId, name: name!, gender, priority: v.priority } });
      return ok({ id: row.id });
    })
    .catch(asResult);
}

export async function removeWorker(db: PrismaClient, args: { villageId: number; activityId: number; id: number }): Promise<Result<{ id: number }>> {
  return db
    .$transaction(async (tx) => {
      const cur = await lockActivity(tx, args.villageId, args.activityId);
      if (!cur) return fail(404, "Kegiatan PKTD tidak ditemukan.");
      if (cur.status === "SELESAI") return fail(409, "Kegiatan sudah selesai.");
      const w = await tx.pktdWorker.findFirst({ where: { id: args.id, activityId: cur.id }, select: { id: true } });
      if (!w) return fail(404, "Pekerja tidak ditemukan.");
      if ((await tx.pktdWorkDay.count({ where: { workerId: w.id } })) > 0) return fail(409, "Pekerja ini sudah memiliki catatan hari kerja dan tidak dapat dihapus.");
      await tx.pktdWorker.delete({ where: { id: w.id } });
      return ok({ id: w.id });
    })
    .catch(asResult);
}

// ---- Hari kerja dan pembayaran upah

/** `skipFunding`: hanya untuk tes dan impor data lama; rute tidak pernah mengisinya. */
export async function addWorkDays(db: PrismaClient, args: { villageId: number; activityId: number; userId: number | null; input: unknown; now?: Date; skipFunding?: boolean }): Promise<Result<{ created: number; total: string; sppId: number | null }>> {
  const p = parseDays(args.input);
  if (!p.ok) return invalid(p);
  const v = p.value;
  return db
    .$transaction(async (tx) => {
      const cur = await lockActivity(tx, args.villageId, args.activityId);
      if (!cur) return fail(404, "Kegiatan PKTD tidak ditemukan.");
      if (cur.status === "SELESAI") return fail(409, "Kegiatan sudah selesai; buka kembali untuk mencatat hari kerja.");
      const date = iso(v.workDate);
      const now = args.now ?? new Date();
      if (date > tomorrowOf(now)) return invalid({ errors: ["Tanggal kerja tidak boleh di masa depan."], fieldErrors: { workDate: "Tidak boleh di masa depan" } });
      if (cur.startDate && v.workDate < cur.startDate) return invalid({ errors: ["Tanggal kerja sebelum tanggal mulai kegiatan."], fieldErrors: { workDate: "Sebelum tanggal mulai kegiatan" } });
      if (cur.endDate && v.workDate > cur.endDate) return invalid({ errors: ["Tanggal kerja setelah tanggal selesai kegiatan."], fieldErrors: { workDate: "Setelah tanggal selesai kegiatan" } });
      const wp = wageProblem(v.wageCents, cur.wageMinCents, cur.wageMaxCents);
      if (wp) return invalid({ errors: [wp], fieldErrors: { wage: wp } });
      if ((await tx.pktdWorkDay.count({ where: { activityId: cur.id } })) + v.workerIds.length > LIMITS.daysPerActivity) return stop(`Catatan hari kerja maksimal ${LIMITS.daysPerActivity} per kegiatan.`);
      const workers = await tx.pktdWorker.findMany({ where: { id: { in: v.workerIds }, activityId: cur.id }, select: { id: true, name: true } });
      if (workers.length !== v.workerIds.length) return fail(404, "Ada pekerja yang bukan bagian dari kegiatan ini.");
      const dup = await tx.pktdWorkDay.findMany({ where: { workerId: { in: v.workerIds }, workDate: v.workDate }, select: { workerId: true } });
      if (dup.length) return stop(`Sudah tercatat pada tanggal itu: ${workers.filter((w) => dup.some((d) => d.workerId === w.id)).map((w) => w.name).slice(0, 5).join(", ")}${dup.length > 5 ? ", dan lainnya" : ""}.`);
      const total = v.wageCents * BigInt(workers.length);
      const agg = await tx.pktdWorkDay.aggregate({ where: { activityId: cur.id }, _sum: { wageCents: true } });
      if ((agg._sum.wageCents ?? 0n) + total > cur.costCents) return stop("Upah yang tercatat akan melebihi total biaya kegiatan.");
      const paidOn = v.paid ? v.workDate : null;
      let sppId: number | null = null;
      if (v.paid && !args.skipFunding) {
        const f = await pickFunding(tx, { villageId: args.villageId, kind: "PKTD", sourceId: cur.id, amountCents: total, paidOn: v.workDate, what: "Pembayaran upah" });
        if (!f.ok) return fail(409, f.message);
        sppId = f.sppId;
      }
      await tx.pktdWorkDay.createMany({ data: workers.map((w) => ({ activityId: cur.id, villageId: args.villageId, workerId: w.id, workDate: v.workDate, task: v.task, wageCents: v.wageCents, paidOn, sppId, note: v.note, createdById: args.userId })) });
      return ok({ created: workers.length, total: fromCents(total), sppId });
    })
    .catch(asResult);
}

/** Menandai upah yang belum dibayar pada satu tanggal kerja sebagai sudah dibayar. */
/** `skipFunding`: hanya untuk tes dan impor data lama; rute tidak pernah mengisinya. */
export async function markPaid(db: PrismaClient, args: { villageId: number; activityId: number; input: unknown; now?: Date; skipFunding?: boolean }): Promise<Result<{ updated: number; sppId: number | null }>> {
  const p = parsePay(args.input);
  if (!p.ok) return invalid(p);
  return db
    .$transaction(async (tx) => {
      const cur = await lockActivity(tx, args.villageId, args.activityId);
      if (!cur) return fail(404, "Kegiatan PKTD tidak ditemukan.");
      if (cur.status === "SELESAI") return fail(409, "Kegiatan sudah selesai; buka kembali untuk mencatat pembayaran.");
      if (iso(p.value.paidOn) > tomorrowOf(args.now ?? new Date())) return invalid({ errors: ["Tanggal pembayaran tidak boleh di masa depan."], fieldErrors: { paidOn: "Tidak boleh di masa depan" } });
      let sppId: number | null = null;
      if (!args.skipFunding) {
        const due = await tx.pktdWorkDay.aggregate({ where: { activityId: cur.id, workDate: p.value.workDate, paidOn: null }, _sum: { wageCents: true } });
        const f = await pickFunding(tx, { villageId: args.villageId, kind: "PKTD", sourceId: cur.id, amountCents: due._sum.wageCents ?? 0n, paidOn: p.value.paidOn, what: "Pembayaran upah" });
        if (!f.ok) return fail(409, f.message);
        sppId = f.sppId;
      }
      const r = await tx.pktdWorkDay.updateMany({ where: { activityId: cur.id, workDate: p.value.workDate, paidOn: null }, data: { paidOn: p.value.paidOn, ...(sppId ? { sppId } : {}) } });
      return r.count ? ok({ updated: r.count, sppId }) : fail(404, "Tidak ada upah yang belum dibayar pada tanggal itu.");
    })
    .catch(asResult);
}

export async function deleteWorkDays(db: PrismaClient, args: { villageId: number; activityId: number; date: Date; allowPaid?: boolean }): Promise<Result<{ deleted: number; paid: number; amount: string }>> {
  return db
    .$transaction(async (tx) => {
      const cur = await lockActivity(tx, args.villageId, args.activityId);
      if (!cur) return fail(404, "Kegiatan PKTD tidak ditemukan.");
      if (cur.status === "SELESAI") return fail(409, "Kegiatan sudah selesai; buka kembali untuk mengoreksi.");
      const rows = await tx.pktdWorkDay.findMany({ where: { activityId: cur.id, workDate: args.date }, select: { wageCents: true, paidOn: true } });
      if (!rows.length) return fail(404, "Tidak ada catatan pada tanggal itu.");
      const paid = rows.filter((r) => r.paidOn).length;
      if (paid && !args.allowPaid) return fail(403, "Ada upah yang sudah dibayarkan pada tanggal itu. Catatan pembayaran hanya dapat dihapus oleh admin.");
      await tx.pktdWorkDay.deleteMany({ where: { activityId: cur.id, workDate: args.date } });
      return ok({ deleted: rows.length, paid, amount: fromCents(rows.reduce((t, r) => t + r.wageCents, 0n)) });
    })
    .catch(asResult);
}

// ---- Pencarian warga dan data cetak

export interface Candidate {
  id: number;
  name: string;
  gender: "L" | "P" | null;
  address: string;
  occupation: string | null;
  alreadyIn: boolean;
  blocked: string | null;
}
export async function searchCandidates(db: Db, args: { villageId: number; activityId: number; q: string }): Promise<Result<Candidate[]>> {
  const q = args.q.trim();
  if (q.length < 2) return ok([]);
  const act = await db.pktdActivity.findFirst({ where: { id: args.activityId, villageId: args.villageId }, select: { id: true } });
  if (!act) return fail(404, "Kegiatan PKTD tidak ditemukan.");
  const rows = await db.resident.findMany({ where: { villageId: args.villageId, name: { contains: q } }, orderBy: { name: "asc" }, take: LIMITS.residentSearch, select: { id: true, name: true, gender: true, rt: true, rw: true, hamlet: true, occupation: true, isAlive: true } });
  const inAct = rows.length ? await db.pktdWorker.findMany({ where: { activityId: act.id, residentId: { in: rows.map((r) => r.id) } }, select: { residentId: true } }) : [];
  return ok(rows.map((r) => ({ id: r.id, name: r.name, gender: /^p/i.test(r.gender) ? ("P" as const) : /^l/i.test(r.gender) ? ("L" as const) : null, address: [r.hamlet, r.rt && `RT ${r.rt}`, r.rw && `RW ${r.rw}`].filter(Boolean).join(", "), occupation: r.occupation, alreadyIn: inAct.some((x) => x.residentId === r.id), blocked: r.isAlive ? null : "Tercatat meninggal" })));
}

export interface PrintData {
  title: string;
  location: string | null;
  year: number;
  wageMin: string | null;
  wageMax: string | null;
  dates: string[];
  rows: { no: number; name: string; priorityLabel: string; cells: (string | null)[]; days: number; total: string; paidAny: boolean }[];
  total: string;
  cost: string;
  recorded: string;
  shareBps: number;
  minPct: number;
}

/** Lembar hari kerja dan upah untuk periode (default: 14 hari kerja terakhir yang tercatat). Tanpa NIK. */
export async function printData(db: Db, args: { villageId: number; id: number; from?: Date | null; to?: Date | null }): Promise<Result<PrintData>> {
  const a = await db.pktdActivity.findFirst({ where: { id: args.id, villageId: args.villageId }, include: { workers: { orderBy: { id: "asc" } } } });
  if (!a) return fail(404, "Kegiatan PKTD tidak ditemukan.");
  const all = await db.pktdWorkDay.findMany({ where: { activityId: a.id }, orderBy: { workDate: "asc" }, select: { workerId: true, workDate: true, wageCents: true, paidOn: true }, take: LIMITS.daysPerActivity });
  const allDates = [...new Set(all.map((d) => iso(d.workDate)))];
  const from = args.from ? iso(args.from) : null;
  const to = args.to ? iso(args.to) : null;
  const dates = (from || to ? allDates.filter((d) => (!from || d >= from) && (!to || d <= to)) : allDates.slice(-14)).slice(0, 31);
  const { rules } = rulesFor(a.year);
  let periodTotal = 0n;
  const dateSet = new Set(dates);
  const byWorkerDate = new Map<number, Map<string, { wageCents: bigint; paidOn: Date | null }>>();
  for (const d of all) {
    const key = iso(d.workDate);
    if (!dateSet.has(key)) continue;
    const m = byWorkerDate.get(d.workerId) ?? new Map();
    m.set(key, { wageCents: d.wageCents, paidOn: d.paidOn });
    byWorkerDate.set(d.workerId, m);
  }
  const rows = a.workers.map((w, i) => {
    const wm = byWorkerDate.get(w.id) ?? new Map<string, { wageCents: bigint; paidOn: Date | null }>();
    const mine = [...wm.values()];
    const total = mine.reduce((t, d) => t + d.wageCents, 0n);
    periodTotal += total;
    return {
      no: i + 1,
      name: w.name,
      priorityLabel: PRIORITIES[w.priority as keyof typeof PRIORITIES]?.label ?? w.priority,
      cells: dates.map((dt) => {
        const d = wm.get(dt);
        return d ? fromCents(d.wageCents) : null;
      }),
      days: mine.length,
      total: fromCents(total),
      paidAny: mine.some((d) => d.paidOn),
    };
  });
  const recorded = all.reduce((t, d) => t + d.wageCents, 0n);
  return ok({
    title: a.title,
    location: a.location,
    year: a.year,
    wageMin: a.wageMinCents === null ? null : fromCents(a.wageMinCents),
    wageMax: a.wageMaxCents === null ? null : fromCents(a.wageMaxCents),
    dates,
    rows: rows.filter((r) => r.days > 0 || !dates.length),
    total: fromCents(periodTotal),
    cost: fromCents(a.costCents),
    recorded: fromCents(recorded),
    shareBps: shareBps(recorded, a.costCents),
    minPct: rules.pktdWageMinPct,
  });
}

// ---- Pengajuan SPP

/** Mengajukan SPP untuk membiayai upah PKTD. Body: kegiatan, rekening, jumlah, nama Kaur/Kasi penerima panjar. */
export async function requestActivitySpp(db: PrismaClient, args: { villageId: number; activityId: number; userId: number | null; input: unknown; now?: Date }) {
  const head = await db.pktdActivity.findFirst({ where: { id: args.activityId, villageId: args.villageId }, select: { year: true, title: true } });
  if (!head) return fail(404, "Kegiatan PKTD tidak ditemukan.");
  return requestFunding(db, {
    villageId: args.villageId,
    userId: args.userId,
    kind: "PKTD",
    sourceId: args.activityId,
    year: head.year,
    input: args.input,
    now: args.now,
    describe: `Upah PKTD ${head.title}`,
    lockModule: async (tx) => {
      await tx.$queryRaw`SELECT id FROM pktd_activities WHERE id = ${args.activityId} AND villageId = ${args.villageId} FOR UPDATE`;
    },
    remainingNeed: async (tx) => {
      const act = await tx.pktdActivity.findFirst({ where: { id: args.activityId, villageId: args.villageId }, select: { status: true, plannedWageCents: true } });
      if (!act) return { refuse: "Kegiatan PKTD tidak ditemukan.", status: 404 };
      if (act.status === "SELESAI") return { refuse: "Kegiatan sudah selesai; buka kembali untuk mengajukan SPP." };
      return { cents: await wageNeed(tx, args.activityId, act.plannedWageCents) };
    },
  });
}
