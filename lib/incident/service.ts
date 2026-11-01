/**
 * Servis primitif kejadian & respons (Prisma). API internal untuk P4 Bencana dan P5 Keamanan; ringkasan dan aturan pakai ada di
 * docs/PHASE3_BENCANA.md bagian "Primitif untuk P5".
 *
 * Aturan umum:
 *  - SETIAP fungsi menerima `domain` dan memakainya di klausa where: rute BENCANA tidak pernah melihat kejadian KEAMANAN (dan sebaliknya).
 *  - `villageId` selalu dari sesi pemanggil. Servis tidak memeriksa izin, kecuali `transition` yang menerima `can` karena izin yang
 *    dibutuhkan bergantung pada status saat ini (dibaca di dalam kunci).
 *  - Semua perubahan pada satu kejadian (status, anak: respons/logistik) memegang kunci baris kejadian (SELECT … FOR UPDATE sebagai
 *    pernyataan pertama transaksi), sehingga gerbang status dan "kejadian tertutup tidak menerima catatan" tidak bisa dilangkahi oleh
 *    permintaan serentak.
 */
import { Prisma, type IncidentEvent, type PrismaClient } from "@prisma/client";
import { fail, invalid, isoDay, type Result } from "@/lib/form-input";
import { fromCents } from "@/lib/coop/loan-math";
import { DOMAIN_DEFS, FUNDING_SOURCES, LIMITS, SEVERITIES, STATUSES, kindLabel, type Domain, type EventStatus, type Severity } from "./catalog";
import { TRANSITIONS, acceptsChildren, incidentFindings, impactSummary, isEditable, maskKk, maskName, transitionAction, transitionGate, type IncidentFinding } from "./calc";
import { parseEventCreate, parseEventListQuery, parseEventPatch, parseLogistic, parseResponse, parseTransition, type EventListQuery } from "./schema";

type Db = Prisma.TransactionClient;
const ok = <T>(data: T): { ok: true; data: T } => ({ ok: true, data });
export class Stop extends Error {
  constructor(
    msg: string,
    readonly status = 409,
  ) {
    super(msg);
  }
}
export const stop = (msg: string, status = 409): never => {
  throw new Stop(msg, status);
};
export const asResult = (e: unknown): Result<never> => {
  if (e instanceof Stop) return fail(e.status, e.message);
  throw e;
};

export interface Locked {
  id: number;
  status: EventStatus;
  severity: Severity;
}
/** Kunci baris kejadian. HARUS pernyataan pertama dalam transaksi interaktif (MySQL REPEATABLE READ). */
export async function lockEvent(tx: Db, villageId: number, domain: Domain, id: number): Promise<Locked> {
  const rows = await tx.$queryRaw<{ id: number; status: string; severity: string }[]>`SELECT id, status, severity FROM incident_events WHERE id = ${id} AND villageId = ${villageId} AND domain = ${domain} FOR UPDATE`;
  if (!rows.length) return stop("Kejadian tidak ditemukan.", 404);
  return { id: rows[0]!.id, status: rows[0]!.status as EventStatus, severity: rows[0]!.severity as Severity };
}

const iso = (d: Date) => d.toISOString();

export interface EventView {
  id: number;
  domain: Domain;
  kind: string;
  kindLabel: string;
  title: string;
  description: string | null;
  occurredAt: string;
  severity: Severity;
  severityLabel: string;
  status: EventStatus;
  statusLabel: string;
  locationText: string | null;
  rt: string | null;
  rw: string | null;
  hamlet: string | null;
  lat: number | null;
  lng: number | null;
  deathCount: number | null;
  missingCount: number | null;
  injuredCount: number | null;
  displacedCount: number | null;
  affectedHouseholds: number | null;
  damagedHouses: number | null;
  loss: string | null;
  impactNote: string | null;
  impactSummary: string;
  supra: { reportedAt: string; to: string | null; reference: string | null } | null;
  resolutionNote: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  responseCount: number;
  logisticCount: number;
  findings: IncidentFinding[];
  createdAt: string;
}

type EventRow = IncidentEvent & { _count?: { responses: number; logistics: number } };

function viewOf(e: EventRow, now: Date): EventView {
  const domain = e.domain as Domain;
  const status = e.status as EventStatus;
  const severity = e.severity as Severity;
  const responseCount = e._count?.responses ?? 0;
  return {
    id: e.id,
    domain,
    kind: e.kind,
    kindLabel: kindLabel(domain, e.kind),
    title: e.title,
    description: e.description,
    occurredAt: iso(e.occurredAt),
    severity,
    severityLabel: SEVERITIES[severity] ?? e.severity,
    status,
    statusLabel: STATUSES[status] ?? e.status,
    locationText: e.locationText,
    rt: e.rt,
    rw: e.rw,
    hamlet: e.hamlet,
    lat: e.lat,
    lng: e.lng,
    deathCount: e.deathCount,
    missingCount: e.missingCount,
    injuredCount: e.injuredCount,
    displacedCount: e.displacedCount,
    affectedHouseholds: e.affectedHouseholds,
    damagedHouses: e.damagedHouses,
    loss: e.lossCents === null ? null : fromCents(e.lossCents),
    impactNote: e.impactNote,
    impactSummary: impactSummary(e),
    supra: e.supraReportedAt ? { reportedAt: iso(e.supraReportedAt), to: e.supraReportedTo, reference: e.supraReference } : null,
    resolutionNote: e.resolutionNote,
    resolvedAt: e.resolvedAt ? iso(e.resolvedAt) : null,
    closedAt: e.closedAt ? iso(e.closedAt) : null,
    responseCount,
    logisticCount: e._count?.logistics ?? 0,
    findings: incidentFindings({ domain, kind: e.kind, severity, status, occurredAt: e.occurredAt, supraReportedAt: e.supraReportedAt, responseCount, now }),
    createdAt: iso(e.createdAt),
  };
}

const COUNT = { select: { responses: true, logistics: true } } as const;

export async function createEvent(db: PrismaClient, args: { domain: Domain; villageId: number; userId: number | null; input: unknown; now?: Date }): Promise<Result<{ id: number; kind: string; severity: Severity; title: string }>> {
  const p = parseEventCreate(args.domain, args.input, args.now);
  if (!p.ok) return invalid(p);
  const v = p.value;
  const row = await db.incidentEvent.create({
    data: { ...v, villageId: args.villageId, createdById: args.userId, status: "OPEN" },
    select: { id: true },
  });
  await db.incidentStatusLog.create({ data: { villageId: args.villageId, eventId: row.id, fromStatus: null, toStatus: "OPEN", byUserId: args.userId, at: args.now ?? new Date() } });
  return ok({ id: row.id, kind: v.kind, severity: v.severity, title: v.title });
}

export interface EventList {
  rows: EventView[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listEvents(db: PrismaClient, args: { domain: Domain; villageId: number; query: EventListQuery; now?: Date }): Promise<Result<EventList>> {
  const { domain, villageId, query } = args;
  const where: Prisma.IncidentEventWhereInput = {
    villageId,
    domain,
    ...(query.status === "ACTIVE" ? { status: { in: ["OPEN", "RESPONDING", "RESOLVED"] } } : query.status ? { status: query.status } : {}),
    ...(query.kind ? { kind: query.kind } : {}),
  };
  const [total, rows] = await Promise.all([
    db.incidentEvent.count({ where }),
    db.incidentEvent.findMany({ where, orderBy: [{ occurredAt: "desc" }, { id: "desc" }], skip: (query.page - 1) * query.pageSize, take: query.pageSize, include: { _count: COUNT } }),
  ]);
  const now = args.now ?? new Date();
  return ok({ rows: rows.map((r) => viewOf(r, now)), total, page: query.page, pageSize: query.pageSize });
}

export const eventListQuery = parseEventListQuery;

export interface ResponseView {
  id: number;
  loggedAt: string;
  kind: string;
  kindLabel: string;
  description: string;
  actor: string | null;
}
export interface LogisticView {
  id: number;
  distributedOn: string;
  /** Tersamarkan (inisial) bila pemanggil tidak punya izin baca rinci */
  recipientName: string;
  /** Hanya 4 digit terakhir; null bila tanpa izin rinci atau bukan KK */
  kk: string | null;
  isHousehold: boolean;
  rt: string | null;
  rw: string | null;
  item: string;
  quantity: number;
  unit: string;
  value: string | null;
  fundingSource: string;
  fundingLabel: string;
  reference: string | null;
  note: string | null;
}
export interface LogisticSummary {
  items: { item: string; unit: string; fundingSource: string; fundingLabel: string; quantity: number; value: string; rows: number }[];
  households: number;
  rows: number;
  totalValue: string;
}
export interface EventDetail {
  event: EventView;
  responses: ResponseView[];
  logistics: { rows: LogisticView[]; total: number; page: number; pageSize: number; summary: LogisticSummary; detailVisible: boolean } | null;
  statusLog: { id: number; from: string | null; to: string; note: string | null; at: string }[];
  /** Status tujuan yang sah dari status sekarang (tampilan memfilter lagi dengan izin) */
  nextStatuses: EventStatus[];
}

const LOG_PAGE = 50;

export async function getEvent(db: PrismaClient, args: { domain: Domain; villageId: number; id: number; detail: boolean; logPage?: number; now?: Date }): Promise<Result<EventDetail>> {
  const { domain, villageId, id } = args;
  const row = await db.incidentEvent.findFirst({ where: { id, villageId, domain }, include: { _count: COUNT } });
  if (!row) return fail(404, "Kejadian tidak ditemukan.");
  const responses = await db.incidentResponse.findMany({ where: { eventId: id, villageId }, orderBy: [{ loggedAt: "desc" }, { id: "desc" }], take: 300 });
  const logs = await db.incidentStatusLog.findMany({ where: { eventId: id, villageId }, orderBy: [{ at: "asc" }, { id: "asc" }], take: 200 });
  const def = DOMAIN_DEFS[domain];

  let logistics: EventDetail["logistics"] = null;
  if (def.logistics) {
    const page = Math.max(1, Math.min(100000, args.logPage ?? 1));
    const [rows, total, groups, hh, sums] = await Promise.all([
      db.incidentLogistic.findMany({ where: { eventId: id, villageId }, orderBy: [{ distributedOn: "desc" }, { id: "desc" }], skip: (page - 1) * LOG_PAGE, take: LOG_PAGE }),
      db.incidentLogistic.count({ where: { eventId: id, villageId } }),
      db.incidentLogistic.groupBy({ by: ["itemKey", "unit", "fundingSource"], where: { eventId: id, villageId }, _sum: { quantity: true, valueCents: true }, _count: { _all: true }, orderBy: { itemKey: "asc" }, take: 200 }),
      db.$queryRaw<{ n: bigint }[]>`SELECT COUNT(DISTINCT householdId) AS n FROM incident_logistics WHERE eventId = ${id} AND villageId = ${villageId} AND householdId IS NOT NULL`,
      db.incidentLogistic.aggregate({ where: { eventId: id, villageId }, _sum: { valueCents: true } }),
    ]);
    // Nama item untuk ringkasan: ambil satu contoh tulisan asli per kunci
    const sample = groups.length ? await db.incidentLogistic.findMany({ where: { eventId: id, villageId, itemKey: { in: groups.map((g) => g.itemKey) } }, distinct: ["itemKey"], select: { itemKey: true, item: true } }) : [];
    const names = new Map(sample.map((s) => [s.itemKey, s.item]));
    const hhIds = [...new Set(rows.map((r) => r.householdId).filter((v): v is number => v !== null))];
    const kkOf = args.detail && hhIds.length ? new Map((await db.household.findMany({ where: { id: { in: hhIds }, villageId }, select: { id: true, kkNumber: true } })).map((h) => [h.id, h.kkNumber])) : new Map<number, string>();
    logistics = {
      rows: rows.map((r) => ({
        id: r.id,
        distributedOn: isoDay(r.distributedOn)!,
        recipientName: args.detail ? r.recipientName : maskName(r.recipientName),
        kk: args.detail && r.householdId !== null ? maskKk(kkOf.get(r.householdId)) : null,
        isHousehold: r.householdId !== null,
        rt: r.rt,
        rw: r.rw,
        item: r.item,
        quantity: r.quantity,
        unit: r.unit,
        value: r.valueCents === null ? null : fromCents(r.valueCents),
        fundingSource: r.fundingSource,
        fundingLabel: FUNDING_SOURCES[r.fundingSource as keyof typeof FUNDING_SOURCES] ?? r.fundingSource,
        reference: r.reference,
        note: r.note,
      })),
      total,
      page,
      pageSize: LOG_PAGE,
      summary: {
        items: groups.map((g) => ({ item: names.get(g.itemKey) ?? g.itemKey, unit: g.unit, fundingSource: g.fundingSource, fundingLabel: FUNDING_SOURCES[g.fundingSource as keyof typeof FUNDING_SOURCES] ?? g.fundingSource, quantity: g._sum.quantity ?? 0, value: fromCents(g._sum.valueCents ?? 0n), rows: g._count._all })),
        households: Number(hh[0]?.n ?? 0),
        rows: total,
        totalValue: fromCents(sums._sum.valueCents ?? 0n),
      },
      detailVisible: args.detail,
    };
  }

  const status = row.status as EventStatus;
  return ok({
    event: viewOf(row, args.now ?? new Date()),
    responses: responses.map((r) => ({ id: r.id, loggedAt: iso(r.loggedAt), kind: r.kind, kindLabel: def.responses[r.kind] ?? r.kind, description: r.description, actor: r.actor })),
    logistics,
    statusLog: logs.map((l) => ({ id: l.id, from: l.fromStatus, to: l.toStatus, note: l.note, at: iso(l.at) })),
    nextStatuses: TRANSITIONS[status],
  });
}

export async function patchEvent(db: PrismaClient, args: { domain: Domain; villageId: number; id: number; input: unknown; now?: Date }): Promise<Result<{ changed: string[]; before: Record<string, unknown>; after: Record<string, unknown> }>> {
  const p = parseEventPatch(args.domain, args.input, args.now);
  if (!p.ok) return invalid(p);
  const v = p.value;
  return db
    .$transaction(async (tx) => {
      const cur = await lockEvent(tx, args.villageId, args.domain, args.id);
      if (!isEditable(cur.status)) return stop(`Kejadian berstatus "${STATUSES[cur.status]}" tidak dapat diubah. Buka kembali penanganannya lebih dulu.`);
      const before = await tx.incidentEvent.findFirstOrThrow({ where: { id: cur.id } });
      if (Object.keys(v).length === 0) return ok({ changed: [], before: {}, after: {} });
      await tx.incidentEvent.update({ where: { id: cur.id }, data: v });
      const changed = Object.keys(v);
      // Audit hanya memuat nilai ringan; uraian dan catatan tidak disalin.
      const light = (o: Record<string, unknown>) => Object.fromEntries(changed.filter((k) => ["kind", "severity", "occurredAt", "deathCount", "missingCount", "injuredCount", "displacedCount", "affectedHouseholds", "damagedHouses", "supraReportedAt"].includes(k)).map((k) => [k, o[k] instanceof Date ? (o[k] as Date).toISOString() : (o[k] ?? null)]));
      return ok({ changed, before: light(before as unknown as Record<string, unknown>), after: light(v as Record<string, unknown>) });
    })
    .catch(asResult);
}

/** Menghapus kejadian yang salah catat: hanya OPEN/CANCELLED dan tanpa catatan distribusi bantuan. */
export async function removeEvent(
  db: PrismaClient,
  args: {
    domain: Domain;
    villageId: number;
    id: number;
    /**
     * Kait modul turunan (mis. Keamanan) yang berjalan di dalam kunci kejadian dan transaksi yang sama, tepat sebelum penghapusan.
     * Mengembalikan pesan penolakan (409) atau null untuk melanjutkan; boleh membersihkan baris turunan lewat `tx`.
     */
    beforeDelete?: (tx: Prisma.TransactionClient, eventId: number) => Promise<string | null>;
  },
): Promise<Result<{ kind: string; title: string; status: EventStatus; responses: number }>> {
  return db
    .$transaction(async (tx) => {
      const cur = await lockEvent(tx, args.villageId, args.domain, args.id);
      if (cur.status !== "OPEN" && cur.status !== "CANCELLED") return stop("Hanya kejadian berstatus Dilaporkan atau Dibatalkan yang dapat dihapus. Kejadian yang sudah ditangani tetap disimpan sebagai arsip.");
      const logistics = await tx.incidentLogistic.count({ where: { eventId: cur.id } });
      if (logistics > 0) return stop("Kejadian ini punya catatan distribusi bantuan, jadi tidak dapat dihapus.");
      if (args.beforeDelete) {
        const refuse = await args.beforeDelete(tx, cur.id);
        if (refuse) return stop(refuse);
      }
      const row = await tx.incidentEvent.findFirstOrThrow({ where: { id: cur.id }, select: { kind: true, title: true } });
      const responses = await tx.incidentResponse.count({ where: { eventId: cur.id } });
      await tx.incidentEvent.delete({ where: { id: cur.id } });
      return ok({ kind: row.kind, title: row.title, status: cur.status, responses });
    })
    .catch(asResult);
}

/**
 * Pindah status. `can` = izin pemanggil ("update"/"approve" pada resource domain); aksi yang dibutuhkan ditentukan dari status
 * di dalam kunci (menutup atau membuka kembali kejadian ditutup = approve).
 */
export async function transition(db: PrismaClient, args: { domain: Domain; villageId: number; id: number; userId: number | null; input: unknown; can: { update: boolean; approve: boolean }; now?: Date }): Promise<Result<{ from: EventStatus; to: EventStatus }>> {
  const p = parseTransition(args.input);
  if (!p.ok) return invalid(p);
  const { to, note } = p.value;
  const now = args.now ?? new Date();
  return db
    .$transaction(async (tx) => {
      const cur = await lockEvent(tx, args.villageId, args.domain, args.id);
      const need = transitionAction(cur.status, to);
      if (!args.can[need]) return stop(need === "approve" ? "Hanya Kepala Desa atau admin yang dapat menutup atau membuka kembali kejadian yang sudah ditutup." : "Anda tidak berhak mengubah status kejadian ini.", 403);
      const row = await tx.incidentEvent.findFirstOrThrow({ where: { id: cur.id }, select: { resolutionNote: true, supraReportedAt: true, severity: true } });
      const responseCount = await tx.incidentResponse.count({ where: { eventId: cur.id } });
      const gate = transitionGate({ from: cur.status, to, severity: row.severity as Severity, responseCount, supraReported: row.supraReportedAt !== null, note, resolutionNote: row.resolutionNote });
      if (gate) return stop(gate, 409);
      const data: Prisma.IncidentEventUpdateInput = { status: to };
      if (to === "RESOLVED") {
        data.resolvedAt = now;
        if (note) data.resolutionNote = note;
      }
      if (to === "CLOSED") data.closedAt = now;
      if (to === "RESPONDING") {
        data.resolvedAt = null;
        data.closedAt = null;
      }
      await tx.incidentEvent.update({ where: { id: cur.id }, data });
      await tx.incidentStatusLog.create({ data: { villageId: args.villageId, eventId: cur.id, fromStatus: cur.status, toStatus: to, note, byUserId: args.userId, at: now } });
      return ok({ from: cur.status, to });
    })
    .catch(asResult);
}

export async function addResponse(db: PrismaClient, args: { domain: Domain; villageId: number; id: number; userId: number | null; input: unknown; now?: Date }): Promise<Result<{ id: number; kind: string }>> {
  const p = parseResponse(args.domain, args.input, args.now);
  if (!p.ok) return invalid(p);
  const v = p.value;
  return db
    .$transaction(async (tx) => {
      const cur = await lockEvent(tx, args.villageId, args.domain, args.id);
      if (!acceptsChildren(cur.status)) return stop(`Kejadian berstatus "${STATUSES[cur.status]}" tidak menerima catatan tindakan baru.`);
      if ((await tx.incidentResponse.count({ where: { eventId: cur.id } })) >= LIMITS.responsesPerEvent) return stop(`Catatan tindakan maksimal ${LIMITS.responsesPerEvent} per kejadian.`);
      const row = await tx.incidentResponse.create({ data: { villageId: args.villageId, eventId: cur.id, loggedAt: v.loggedAt, kind: v.kind, description: v.description, actor: v.actor, createdById: args.userId } });
      return ok({ id: row.id, kind: v.kind });
    })
    .catch(asResult);
}

export async function removeResponse(db: PrismaClient, args: { domain: Domain; villageId: number; id: number; responseId: number }): Promise<Result<{ kind: string }>> {
  return db
    .$transaction(async (tx) => {
      const cur = await lockEvent(tx, args.villageId, args.domain, args.id);
      if (!acceptsChildren(cur.status)) return stop(`Kejadian berstatus "${STATUSES[cur.status]}" tidak dapat diubah catatannya.`);
      const row = await tx.incidentResponse.findFirst({ where: { id: args.responseId, eventId: cur.id, villageId: args.villageId } });
      if (!row) return stop("Catatan tindakan tidak ditemukan.", 404);
      // Gerbang "selesai ditangani" mensyaratkan minimal satu tindakan: jangan biarkan kejadian selesai tanpa tindakan.
      if (cur.status === "RESOLVED" && (await tx.incidentResponse.count({ where: { eventId: cur.id } })) <= 1) return stop("Kejadian sudah ditandai selesai dan harus punya minimal satu tindakan. Buka kembali penanganan bila perlu mengoreksi.");
      await tx.incidentResponse.delete({ where: { id: row.id } });
      return ok({ kind: row.kind });
    })
    .catch(asResult);
}

export interface HouseholdHit {
  id: number;
  headName: string;
  kkLast4: string;
  rt: string | null;
  rw: string | null;
  members: number;
}

/** Cari KK aktif menurut nama kepala keluarga atau nomor KK untuk memilih penerima bantuan. Hanya 4 digit KK terakhir yang keluar. */
export async function searchHouseholds(db: PrismaClient, args: { villageId: number; q: string; limit?: number }): Promise<HouseholdHit[]> {
  // Karakter pola LIKE (% _ \\) dilucuti agar masukan tidak berlaku sebagai wildcard.
  const q = args.q.replace(/[%_\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  if (q.length < 3) return [];
  const isDigits = /^\d+$/.test(q);
  const rows = await db.household.findMany({
    where: { villageId: args.villageId, status: "ACTIVE", ...(isDigits ? { kkNumber: { startsWith: q } } : { headResident: { name: { contains: q } } }) },
    orderBy: { id: "asc" },
    take: Math.min(args.limit ?? 10, 20),
    select: { id: true, kkNumber: true, rt: true, rw: true, headResident: { select: { name: true } }, _count: { select: { members: true } } },
  });
  return rows.map((h) => ({ id: h.id, headName: h.headResident?.name ?? "(kepala KK belum diisi)", kkLast4: h.kkNumber.slice(-4), rt: h.rt, rw: h.rw, members: h._count.members }));
}

const P2002 = (e: unknown): boolean => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

export async function addLogistic(db: PrismaClient, args: { domain: Domain; villageId: number; id: number; userId: number | null; input: unknown; now?: Date }): Promise<Result<{ id: number; item: string; quantity: number; householdId: number | null; warnings: string[] }>> {
  if (!DOMAIN_DEFS[args.domain].logistics) return fail(400, "Distribusi bantuan tidak berlaku untuk jenis kejadian ini.");
  const p = parseLogistic(args.input);
  if (!p.ok) return invalid(p);
  const v = p.value;
  const now = args.now ?? new Date();
  if (v.distributedOn.getTime() > now.getTime() + 86_400_000) return invalid({ errors: ["Tanggal penyerahan tidak boleh di masa depan."], fieldErrors: { distributedOn: "Tidak boleh di masa depan" } });
  return db
    .$transaction(async (tx) => {
      const cur = await lockEvent(tx, args.villageId, args.domain, args.id);
      if (!acceptsChildren(cur.status)) return stop(`Kejadian berstatus "${STATUSES[cur.status]}" tidak menerima distribusi baru.`);
      const ev = await tx.incidentEvent.findFirstOrThrow({ where: { id: cur.id }, select: { occurredAt: true } });
      if (isoDay(v.distributedOn)! < isoDay(new Date(ev.occurredAt.getTime() - 86_400_000))!) return invalid({ errors: ["Tanggal penyerahan sebelum kejadian."], fieldErrors: { distributedOn: "Tidak boleh lebih awal dari tanggal kejadian" } });
      if ((await tx.incidentLogistic.count({ where: { eventId: cur.id } })) >= LIMITS.logisticsPerEvent) return stop(`Catatan distribusi maksimal ${LIMITS.logisticsPerEvent} per kejadian.`);

      let name = v.recipientName;
      let rt: string | null = null;
      let rw: string | null = null;
      if (v.householdId) {
        const hh = await tx.household.findFirst({ where: { id: v.householdId, villageId: args.villageId }, select: { status: true, kkNumber: true, rt: true, rw: true, headResident: { select: { name: true } } } });
        if (!hh) return stop("KK penerima tidak ditemukan di desa ini.", 404);
        if (hh.status !== "ACTIVE") return stop("KK penerima sudah tidak aktif.");
        name = hh.headResident?.name ?? name ?? `KK ${maskKk(hh.kkNumber)}`;
        rt = hh.rt;
        rw = hh.rw;
      }
      const warnings: string[] = [];
      if (v.householdId) {
        const prior = await tx.incidentLogistic.count({ where: { eventId: cur.id, householdId: v.householdId, itemKey: v.itemKey } });
        if (prior > 0) warnings.push(`KK ini sudah pernah menerima "${v.item}" pada kejadian yang sama (${prior} kali sebelumnya). Pastikan bukan pencatatan ganda.`);
      } else if (name) {
        // Penerima non-KK tidak kena kunci unik; hitung berdasarkan nama (spasi dirapikan oleh parser, perbandingan tak peka huruf besar) + barang.
        const prior = await tx.incidentLogistic.count({ where: { eventId: cur.id, householdId: null, recipientName: name, itemKey: v.itemKey } });
        if (prior > 0) warnings.push(`"${name}" sudah pernah menerima "${v.item}" pada kejadian yang sama (${prior} kali sebelumnya). Pastikan bukan pencatatan ganda.`);
      }
      try {
        const row = await tx.incidentLogistic.create({
          data: { villageId: args.villageId, eventId: cur.id, householdId: v.householdId, recipientName: name!, rt, rw, item: v.item, itemKey: v.itemKey, quantity: v.quantity, unit: v.unit, valueCents: v.valueCents, fundingSource: v.fundingSource, distributedOn: v.distributedOn, reference: v.reference, note: v.note, createdById: args.userId },
        });
        return ok({ id: row.id, item: v.item, quantity: v.quantity, householdId: v.householdId, warnings });
      } catch (e) {
        if (P2002(e)) return stop(`"${v.item}" untuk KK ini pada tanggal tersebut sudah dicatat. Hapus catatan yang ada lalu catat ulang bila jumlahnya keliru, atau pilih tanggal lain.`);
        throw e;
      }
    })
    .catch(asResult);
}

export async function removeLogistic(db: PrismaClient, args: { domain: Domain; villageId: number; id: number; logisticId: number }): Promise<Result<{ item: string; quantity: number; unit: string; householdId: number | null }>> {
  return db
    .$transaction(async (tx) => {
      const cur = await lockEvent(tx, args.villageId, args.domain, args.id);
      if (!acceptsChildren(cur.status)) return stop(`Kejadian berstatus "${STATUSES[cur.status]}" tidak dapat diubah catatannya.`);
      const row = await tx.incidentLogistic.findFirst({ where: { id: args.logisticId, eventId: cur.id, villageId: args.villageId } });
      if (!row) return stop("Catatan distribusi tidak ditemukan.", 404);
      await tx.incidentLogistic.delete({ where: { id: row.id } });
      return ok({ item: row.item, quantity: row.quantity, unit: row.unit, householdId: row.householdId });
    })
    .catch(asResult);
}

export interface DomainSummary {
  byStatus: Record<EventStatus, number>;
  active: number;
  yearToDate: number;
  year: number;
  impactYear: { deaths: number; missing: number; injured: number; displaced: number; households: number; houses: number };
  recent: EventView[];
}

/** Ringkasan satu domain (tanpa data pribadi): jumlah per status, dampak tahun berjalan, kejadian terbaru. */
export async function domainSummary(db: PrismaClient, args: { domain: Domain; villageId: number; now?: Date }): Promise<DomainSummary> {
  const now = args.now ?? new Date();
  const year = now.getUTCFullYear();
  const start = new Date(Date.UTC(year, 0, 1));
  const [groups, ytd, agg, recent] = await Promise.all([
    db.incidentEvent.groupBy({ by: ["status"], where: { villageId: args.villageId, domain: args.domain }, _count: { _all: true } }),
    db.incidentEvent.count({ where: { villageId: args.villageId, domain: args.domain, occurredAt: { gte: start }, status: { not: "CANCELLED" } } }),
    db.incidentEvent.aggregate({ where: { villageId: args.villageId, domain: args.domain, occurredAt: { gte: start }, status: { not: "CANCELLED" } }, _sum: { deathCount: true, missingCount: true, injuredCount: true, displacedCount: true, affectedHouseholds: true, damagedHouses: true } }),
    db.incidentEvent.findMany({ where: { villageId: args.villageId, domain: args.domain, status: { in: ["OPEN", "RESPONDING", "RESOLVED"] } }, orderBy: [{ occurredAt: "desc" }, { id: "desc" }], take: 5, include: { _count: COUNT } }),
  ]);
  const byStatus = { OPEN: 0, RESPONDING: 0, RESOLVED: 0, CLOSED: 0, CANCELLED: 0 } as Record<EventStatus, number>;
  for (const g of groups) byStatus[g.status as EventStatus] = g._count._all;
  return {
    byStatus,
    active: byStatus.OPEN + byStatus.RESPONDING + byStatus.RESOLVED,
    yearToDate: ytd,
    year,
    impactYear: { deaths: agg._sum.deathCount ?? 0, missing: agg._sum.missingCount ?? 0, injured: agg._sum.injuredCount ?? 0, displaced: agg._sum.displacedCount ?? 0, households: agg._sum.affectedHouseholds ?? 0, houses: agg._sum.damagedHouses ?? 0 },
    recent: recent.map((r) => viewOf(r, now)),
  };
}
