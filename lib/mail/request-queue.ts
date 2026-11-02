import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { evalContexts, evaluateMailRequest, PENDING_SELECT, type MailEvaluation } from "@/lib/ai/laras-mail";

/**
 * Antrean Permohonan Warga (halaman /permohonan-warga): penyaring, statistik dari seluruh data (bukan hanya halaman aktif),
 * dan pemeriksaan server per baris. Bagian murni (parseQueueParams, buildWhere, uiStatus) diuji tanpa DB.
 */

export const STALE_DAYS = 7;
export const MAX_PAGE_SIZE = 50;
export const BURST_WINDOW_DAYS = 7;
export const BURST_THRESHOLD = 3;

export type UiStatus = "PENDING" | "SELESAI" | "DITOLAK";
/** Antrean kerja: potongan permohonan yang menunggu. */
export type QueueView = "siap" | "menunggu_rt" | "ditolak_rt" | "lama";
export const QUEUE_VIEWS: readonly QueueView[] = ["siap", "menunggu_rt", "ditolak_rt", "lama"];
export const CHANNELS = ["portal", "kiosk", "mobile"] as const;
export type RtFilter = "none" | "pending" | "approved" | "rejected";

export type QueueFilters = {
  search?: string;
  status?: "pending" | "approved" | "rejected";
  queue?: QueueView;
  mailType?: string;
  channel?: string;
  rt?: RtFilter;
  from?: Date;
  to?: Date;
  sort: "newest" | "oldest";
  page: number;
  pageSize: number;
};

const STATUS_PARAM: Record<string, "pending" | "approved" | "rejected"> = {
  PENDING: "pending",
  DIPROSES: "pending", // alias lama: status "diproses" tidak pernah ada di DB
  SELESAI: "approved",
  DITOLAK: "rejected",
};

export function uiStatus(dbStatus: string): UiStatus {
  return dbStatus === "approved" ? "SELESAI" : dbStatus === "rejected" ? "DITOLAK" : "PENDING";
}

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  // Number(null) dan Number("") bernilai 0 (bukan NaN): parameter yang tidak ada harus memakai nilai bawaan, bukan `min`.
  if (raw == null || raw.trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function parseDate(raw: string | null, endOfDay: boolean): Date | undefined {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return undefined;
  const d = new Date(`${raw}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function parseQueueParams(sp: URLSearchParams): QueueFilters {
  const search = sp.get("search")?.trim().slice(0, 100) || undefined;
  const statusRaw = sp.get("status");
  const queueRaw = sp.get("queue");
  const rtRaw = sp.get("rt");
  const channel = sp.get("channel");
  const mailType = sp.get("mailType")?.trim().slice(0, 255) || undefined;
  return {
    search,
    status: statusRaw ? STATUS_PARAM[statusRaw] : undefined,
    queue: QUEUE_VIEWS.includes(queueRaw as QueueView) ? (queueRaw as QueueView) : undefined,
    mailType,
    channel: channel && (CHANNELS as readonly string[]).includes(channel) ? channel : undefined,
    rt: rtRaw === "none" || rtRaw === "pending" || rtRaw === "approved" || rtRaw === "rejected" ? rtRaw : undefined,
    from: parseDate(sp.get("from"), false),
    to: parseDate(sp.get("to"), true),
    sort: sp.get("sort") === "oldest" ? "oldest" : "newest",
    page: clampInt(sp.get("page"), 1, 1, 100_000),
    pageSize: clampInt(sp.get("pageSize"), 10, 1, MAX_PAGE_SIZE),
  };
}

export function staleCutoff(now = new Date()): Date {
  return new Date(now.getTime() - STALE_DAYS * 86_400_000);
}

export function buildWhere(villageId: number, f: Partial<QueueFilters>, now = new Date()): Prisma.MailRequestWhereInput {
  const and: Prisma.MailRequestWhereInput[] = [{ villageId }];
  if (f.search) {
    and.push({
      OR: [
        { name: { contains: f.search } },
        { nik: { contains: f.search } },
        { mailType: { contains: f.search } },
        { requestNumber: { contains: f.search } },
      ],
    });
  }
  if (f.status) and.push({ status: f.status });
  if (f.mailType) and.push({ mailType: f.mailType });
  if (f.channel) and.push({ channel: f.channel });
  if (f.rt === "none") and.push({ rtStatus: null });
  else if (f.rt) and.push({ rtStatus: f.rt });
  if (f.from || f.to) and.push({ requestDate: { ...(f.from ? { gte: f.from } : {}), ...(f.to ? { lte: f.to } : {}) } });
  switch (f.queue) {
    case "siap":
      and.push({ status: "pending", OR: [{ rtStatus: null }, { rtStatus: "approved" }] });
      break;
    case "menunggu_rt":
      and.push({ status: "pending", rtStatus: "pending" });
      break;
    case "ditolak_rt":
      and.push({ status: "pending", rtStatus: "rejected" });
      break;
    case "lama":
      and.push({ status: "pending", requestDate: { lt: staleCutoff(now) } });
      break;
  }
  return { AND: and };
}

// ------------------------------------------------------------------ baris + pemeriksaan

export type QueueRow = {
  id: number;
  requestNumber: string;
  name: string;
  nik: string;
  mailType: string;
  purpose: string;
  status: UiStatus;
  channel: string;
  rtStatus: string | null;
  rtNote: string | null;
  rtLabel: string | null;
  requestDate: string;
  processedDate: string | null;
  ageDays: number;
  notes: string | null;
  rejectionReason: string | null;
  mailServiceId: number | null;
  residentId: number | null;
  checks: RowChecks | null;
};

export type RowChecks = {
  /** Boleh diputuskan sekarang (pending dan tahap RT tidak menghalangi). */
  ready: boolean;
  blocking: string[];
  warnings: string[];
  /** Peringatan yang menghalangi persetujuan otomatis (data pemohon meragukan). */
  blocksApproval: boolean;
  /** Ada sesuatu yang perlu dilihat manusia sebelum memutuskan. */
  attention: boolean;
};

type DbRow = Prisma.MailRequestGetPayload<Record<string, never>>;

export function toRowChecks(ev: MailEvaluation, burst: number): RowChecks {
  const warnings = [...ev.warnings];
  if (burst >= BURST_THRESHOLD) {
    warnings.push(`Pemohon mengajukan ${burst} permohonan dalam ${BURST_WINDOW_DAYS} hari terakhir.`);
  }
  return {
    ready: ev.ready,
    blocking: ev.blocking,
    warnings,
    blocksApproval: ev.approvalBlockers.length > 0,
    attention: ev.ready && warnings.length > 0,
  };
}

function rtLabelOf(r: { applicantRt: string | null; applicantRw: string | null }): string | null {
  return r.applicantRt ? `RT ${r.applicantRt}${r.applicantRw ? `/RW ${r.applicantRw}` : ""}` : null;
}

/** Jumlah permohonan per NIK dalam 7 hari terakhir (semua status), untuk tanda "sering mengajukan". */
async function burstCounts(villageId: number, niks: string[], now: Date): Promise<Map<string, number>> {
  if (niks.length === 0) return new Map();
  const grouped = await prisma.mailRequest.groupBy({
    by: ["nik"],
    where: { villageId, nik: { in: niks }, requestDate: { gte: new Date(now.getTime() - BURST_WINDOW_DAYS * 86_400_000) } },
    _count: { _all: true },
  });
  return new Map(grouped.map((g) => [g.nik, g._count._all]));
}

export async function enrichRows(villageId: number, rows: DbRow[], now = new Date()): Promise<QueueRow[]> {
  const pending = rows.filter((r) => r.status === "pending");
  const ctxFor = await evalContexts(villageId, pending);
  const burst = await burstCounts(villageId, Array.from(new Set(pending.map((r) => r.nik))), now);
  return rows.map((r) => {
    const isPending = r.status === "pending";
    return {
      id: Number(r.id),
      requestNumber: r.requestNumber,
      name: r.name,
      nik: r.nik,
      mailType: r.mailType,
      purpose: r.purpose,
      status: uiStatus(r.status),
      channel: r.channel,
      rtStatus: r.rtStatus,
      rtNote: r.rtNote,
      rtLabel: rtLabelOf(r),
      requestDate: r.requestDate.toISOString(),
      processedDate: r.processedDate?.toISOString() ?? null,
      ageDays: Math.floor((now.getTime() - r.requestDate.getTime()) / 86_400_000),
      notes: r.notes,
      rejectionReason: r.rejectionReason,
      mailServiceId: r.mailServiceId == null ? null : Number(r.mailServiceId),
      residentId: r.residentId,
      checks: isPending ? toRowChecks(evaluateMailRequest(r, ctxFor(r), now), burst.get(r.nik) ?? 0) : null,
    };
  });
}

export async function listMailRequests(villageId: number, f: QueueFilters, now = new Date()) {
  const where = buildWhere(villageId, f, now);
  const [total, rows] = await Promise.all([
    prisma.mailRequest.count({ where }),
    prisma.mailRequest.findMany({
      where,
      orderBy: { requestDate: f.sort === "oldest" ? "asc" : "desc" },
      skip: (f.page - 1) * f.pageSize,
      take: f.pageSize,
    }),
  ]);
  return { total, rows: await enrichRows(villageId, rows, now) };
}

// ------------------------------------------------------------------ statistik

export type QueueStats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  siap: number;
  menungguRt: number;
  ditolakRt: number;
  lama: number;
  oldestPendingDays: number | null;
  masukHariIni: number;
  /** Median lama pemrosesan (jam) permohonan yang selesai 30 hari terakhir; null bila belum ada data. */
  medianJamProses: number | null;
  topPending: Array<{ mailType: string; count: number }>;
  jenis: string[];
};

export function medianHours(pairs: Array<{ start: Date; end: Date }>): number | null {
  const hours = pairs.map((p) => (p.end.getTime() - p.start.getTime()) / 3_600_000).filter((h) => h >= 0).sort((a, b) => a - b);
  if (hours.length === 0) return null;
  const mid = Math.floor(hours.length / 2);
  const v = hours.length % 2 ? hours[mid] : (hours[mid - 1] + hours[mid]) / 2;
  return Math.round(v * 10) / 10;
}

export async function getQueueStats(villageId: number, now = new Date()): Promise<QueueStats> {
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);
  const since30 = new Date(now.getTime() - 30 * 86_400_000);
  const count = (extra: Prisma.MailRequestWhereInput) => prisma.mailRequest.count({ where: { villageId, ...extra } });

  const [byStatus, siap, menungguRt, ditolakRt, lama, masukHariIni, oldest, processed, topPending, types] = await Promise.all([
    prisma.mailRequest.groupBy({ by: ["status"], where: { villageId }, _count: { _all: true } }),
    count({ status: "pending", OR: [{ rtStatus: null }, { rtStatus: "approved" }] }),
    count({ status: "pending", rtStatus: "pending" }),
    count({ status: "pending", rtStatus: "rejected" }),
    count({ status: "pending", requestDate: { lt: staleCutoff(now) } }),
    count({ requestDate: { gte: day } }),
    prisma.mailRequest.findFirst({ where: { villageId, status: "pending" }, orderBy: { requestDate: "asc" }, select: { requestDate: true } }),
    prisma.mailRequest.findMany({
      where: { villageId, status: { in: ["approved", "rejected"] }, processedDate: { gte: since30 } },
      select: { requestDate: true, processedDate: true },
      orderBy: { processedDate: "desc" },
      take: 300,
    }),
    prisma.mailRequest.groupBy({
      by: ["mailType"],
      where: { villageId, status: "pending" },
      _count: { _all: true },
      orderBy: { _count: { mailType: "desc" } },
      take: 5,
    }),
    prisma.mailRequest.groupBy({ by: ["mailType"], where: { villageId }, orderBy: { mailType: "asc" }, take: 100 }),
  ]);
  const n = (s: string) => byStatus.find((b) => b.status === s)?._count._all ?? 0;
  return {
    total: byStatus.reduce((a, b) => a + b._count._all, 0),
    pending: n("pending"),
    approved: n("approved"),
    rejected: n("rejected"),
    siap,
    menungguRt,
    ditolakRt,
    lama,
    oldestPendingDays: oldest ? Math.floor((now.getTime() - oldest.requestDate.getTime()) / 86_400_000) : null,
    masukHariIni,
    medianJamProses: medianHours(
      processed.flatMap((p) => (p.processedDate ? [{ start: p.requestDate, end: p.processedDate }] : [])),
    ),
    topPending: topPending.map((t) => ({ mailType: t.mailType, count: t._count._all })),
    jenis: types.map((t) => t.mailType),
  };
}

export { PENDING_SELECT };
