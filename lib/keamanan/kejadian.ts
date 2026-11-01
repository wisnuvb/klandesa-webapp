/**
 * Kejadian keamanan, mediasi, tindak lanjut, dan tautan Pengaduan. Kejadian memakai primitif `lib/incident/service` dengan domain tetap KEAMANAN;
 * tabel turunan (`security_mediations`, `security_followups`, `security_report_links`) merujuk `incident_events.id` tanpa FK Prisma, sehingga:
 *  - setiap fungsi memeriksa domain KEAMANAN + villageId lewat `lockEvent` (kunci baris kejadian, pernyataan pertama transaksi),
 *  - penghapusan kejadian lewat `removeEvent(... beforeDelete)` menolak bila masih ada mediasi/tindak lanjut dan membersihkan tautan.
 * PRIVASI: nama pihak mediasi disamarkan tanpa izin baca rinci; tidak ada kolom NIK/alamat/telepon/identitas korban; teks bebas diperiksa
 * penjaga kekerasan perempuan/anak (calc.sensitiveViolenceTerm); modul ini tidak dipakai API mobile/publik/v1/MCP/Laras (dijaga tes).
 */
import { fail, invalid, isRecord, type Result } from "@/lib/form-input";
import { acceptsChildren } from "@/lib/incident/calc";
import * as inc from "@/lib/incident/service";
import { lockEvent } from "@/lib/incident/service";
import { parseTransition } from "@/lib/incident/schema";
import { DOMAIN_DEFS } from "@/lib/incident/catalog";
import { LIMITS, MEDIATION_OUTCOMES, MEDIATION_STATUSES, PARTY_SIDES } from "./catalog";
import { SENSITIVE_MESSAGE, ageOn, firstSensitiveField, mediationGate, partyDisplayName } from "./calc";
import { P2002, asResult, day, iso, likeSafe, ok, residentsById, stop, type Client, type Db } from "./base";
import { parseFollowup, parseFollowupDone, parseMediation, parseMediationComplete, parseParty, parsePartyPatch, parseReportLink } from "./schema";

const DOMAIN = "KEAMANAN" as const;
const EVENT_TEXT_KEYS = ["title", "description", "impactNote", "locationText", "hamlet", "supraReportedTo", "supraReference", "note", "actor"];

/** Penjaga teks bebas pada masukan kejadian (modul insiden bersama tidak tahu aturan ini). */
function sensitiveFail(input: unknown, keys = EVENT_TEXT_KEYS) {
  if (!isRecord(input)) return null;
  const hit = firstSensitiveField(Object.fromEntries(keys.filter((k) => k in input).map((k) => [k, input[k]])));
  return hit ? ({ ok: false as const, status: 422, errors: [SENSITIVE_MESSAGE], fieldErrors: { [hit]: SENSITIVE_MESSAGE } }) : null;
}

// ---------------------------------------------------------------------------------------------------------------------
// Kejadian
// ---------------------------------------------------------------------------------------------------------------------
export const createSecurityEvent = (db: Client, a: { villageId: number; userId: number | null; input: unknown; now?: Date }) => sensitiveFail(a.input) ?? inc.createEvent(db, { domain: DOMAIN, ...a });
export const patchSecurityEvent = (db: Client, a: { villageId: number; id: number; input: unknown; now?: Date }) => sensitiveFail(a.input) ?? inc.patchEvent(db, { domain: DOMAIN, ...a });
export const addSecurityResponse = (db: Client, a: { villageId: number; id: number; userId: number | null; input: unknown; now?: Date }) => sensitiveFail(a.input, ["description", "actor"]) ?? inc.addResponse(db, { domain: DOMAIN, ...a });
export const removeSecurityResponse = (db: Client, a: { villageId: number; id: number; responseId: number }) => inc.removeResponse(db, { domain: DOMAIN, ...a });

/**
 * Pindah status. Menutup kejadian yang masih punya mediasi terjadwal atau tindak lanjut belum selesai wajib beralasan (gerbang
 * kebijakan aplikasi; diperiksa sebelum masuk kunci kejadian, jadi bersifat pengingat: tidak ada invarian data yang bergantung padanya).
 */
export async function transitionSecurity(db: Client, a: { villageId: number; id: number; userId: number | null; input: unknown; can: { update: boolean; approve: boolean }; now?: Date }) {
  const bad = sensitiveFail(a.input, ["note"]);
  if (bad) return bad;
  const t = parseTransition(a.input);
  if (t.ok && t.value.to === "CLOSED" && (t.value.note ?? "").trim().length < 5) {
    const [fu, med] = await Promise.all([db.securityFollowup.count({ where: { villageId: a.villageId, eventId: a.id, status: "OPEN" } }), db.securityMediation.count({ where: { villageId: a.villageId, eventId: a.id, status: "SCHEDULED" } })]);
    if (fu + med > 0) return fail(409, `Masih ada ${fu} tindak lanjut belum selesai dan ${med} mediasi terjadwal. Selesaikan, atau tulis alasan penutupan (minimal 5 karakter).`);
  }
  return inc.transition(db, { domain: DOMAIN, ...a });
}

/** Hapus kejadian salah catat: ditolak bila ada mediasi atau tindak lanjut; tautan pengaduan dibersihkan; catatan ronda dilepas dari kejadian. */
export const removeSecurityEvent = (db: Client, a: { villageId: number; id: number }) =>
  inc.removeEvent(db, {
    domain: DOMAIN,
    ...a,
    beforeDelete: async (tx, eventId) => {
      const [med, fu] = await Promise.all([tx.securityMediation.count({ where: { eventId, villageId: a.villageId } }), tx.securityFollowup.count({ where: { eventId, villageId: a.villageId } })]);
      if (med + fu > 0) return "Kejadian ini punya berita acara mediasi atau tindak lanjut, jadi tidak dapat dihapus. Batalkan kejadian bila salah catat.";
      await tx.securityReportLink.deleteMany({ where: { eventId, villageId: a.villageId } });
      await tx.securityRondaLog.updateMany({ where: { eventId, villageId: a.villageId }, data: { eventId: null } });
      return null;
    },
  });

export const eventListQuery = (sp: URLSearchParams) => inc.eventListQuery(DOMAIN, sp);

export type SecurityEventRow = inc.EventView & { mediationCount: number; openFollowups: number; reportLinks: number };

export async function listSecurityEvents(db: Client, a: { villageId: number; query: ReturnType<typeof eventListQuery>; now?: Date }): Promise<Result<{ rows: SecurityEventRow[]; total: number; page: number; pageSize: number }>> {
  const r = await inc.listEvents(db, { domain: DOMAIN, villageId: a.villageId, query: a.query, now: a.now });
  if (!r.ok) return r;
  const ids = r.data.rows.map((x) => x.id);
  const [med, fu, links] = ids.length
    ? await Promise.all([
        db.securityMediation.groupBy({ by: ["eventId"], where: { villageId: a.villageId, eventId: { in: ids }, status: { not: "CANCELLED" } }, _count: { _all: true } }),
        db.securityFollowup.groupBy({ by: ["eventId"], where: { villageId: a.villageId, eventId: { in: ids }, status: "OPEN" }, _count: { _all: true } }),
        db.securityReportLink.groupBy({ by: ["eventId"], where: { villageId: a.villageId, eventId: { in: ids } }, _count: { _all: true } }),
      ])
    : [[], [], []];
  const m = (rows: { eventId: number; _count: { _all: number } }[], id: number) => rows.find((x) => x.eventId === id)?._count._all ?? 0;
  return ok({ ...r.data, rows: r.data.rows.map((x) => ({ ...x, mediationCount: m(med, x.id), openFollowups: m(fu, x.id), reportLinks: m(links, x.id) })) });
}

// ---------------------------------------------------------------------------------------------------------------------
// Rincian kejadian beserta mediasi, tindak lanjut, dan tautan pengaduan
// ---------------------------------------------------------------------------------------------------------------------
export interface PartyView {
  id: number;
  side: string;
  sideLabel: string;
  /** Tersamar bila pemanggil tidak punya izin baca rinci */
  name: string;
  masked: boolean;
  isMinor: boolean;
  attended: boolean;
  agrees: boolean | null;
  note: string | null;
  fromResidents: boolean;
}
export interface MediationView {
  id: number;
  eventId: number;
  scheduledAt: string;
  place: string;
  mediator: string;
  status: string;
  statusLabel: string;
  outcome: string | null;
  outcomeLabel: string | null;
  agreement: string | null;
  /** Ada isi kesepakatan tetapi disembunyikan karena pemanggil tanpa izin baca rinci */
  agreementHidden: boolean;
  referredTo: string | null;
  documentRef: string | null;
  note: string | null;
  parties: PartyView[];
}
export interface FollowupView {
  id: number;
  eventId: number;
  mediationId: number | null;
  description: string;
  dueOn: string | null;
  assignee: string | null;
  status: string;
  overdue: boolean;
  doneAt: string | null;
  doneNote: string | null;
}
export interface ReportLinkView {
  id: number;
  citizenReportId: string;
  /** null bila pemanggil tidak berhak membaca Pengaduan */
  title: string | null;
  status: string | null;
  category: string | null;
  createdAt: string | null;
}
export type SecurityEventDetail = inc.EventDetail & { mediations: MediationView[]; followups: FollowupView[]; reports: ReportLinkView[] };

async function mediationViews(db: Client, villageId: number, eventId: number, detail: boolean): Promise<MediationView[]> {
  const rows = await db.securityMediation.findMany({ where: { villageId, eventId }, orderBy: [{ scheduledAt: "desc" }, { id: "desc" }], take: LIMITS.mediationsPerEvent, include: { parties: { orderBy: { id: "asc" }, take: LIMITS.partiesPerMediation } } });
  return rows.map((m) => ({
    id: m.id,
    eventId: m.eventId,
    scheduledAt: m.scheduledAt.toISOString(),
    place: m.place,
    mediator: m.mediator,
    status: m.status,
    statusLabel: MEDIATION_STATUSES[m.status as keyof typeof MEDIATION_STATUSES] ?? m.status,
    outcome: m.outcome,
    outcomeLabel: m.outcome ? (MEDIATION_OUTCOMES[m.outcome as keyof typeof MEDIATION_OUTCOMES] ?? m.outcome) : null,
    // Isi kesepakatan hanya untuk izin baca rinci (bisa memuat uraian sensitif); yang lain melihat bahwa isinya ada.
    agreement: detail ? m.agreement : null,
    agreementHidden: !detail && m.agreement !== null,
    referredTo: m.referredTo,
    documentRef: m.documentRef,
    note: m.note,
    // Nama pihak anak (< 18 tahun) disamarkan untuk SEMUA peran, termasuk pemegang izin rinci; catatan pihak hanya untuk izin rinci.
    parties: m.parties.map((p) => ({ id: p.id, side: p.side, sideLabel: PARTY_SIDES[p.side as keyof typeof PARTY_SIDES] ?? p.side, name: partyDisplayName(p.name, detail && !p.isMinor), masked: !detail || p.isMinor, isMinor: p.isMinor, attended: p.attended, agrees: p.agrees, note: detail ? p.note : null, fromResidents: p.residentId !== null })),
  }));
}

async function followupViews(db: Client, villageId: number, eventId: number, today: string): Promise<FollowupView[]> {
  const rows = await db.securityFollowup.findMany({ where: { villageId, eventId }, orderBy: [{ status: "desc" }, { dueOn: "asc" }, { id: "asc" }], take: LIMITS.followupsPerEvent });
  return rows.map((f) => ({ id: f.id, eventId: f.eventId, mediationId: f.mediationId, description: f.description, dueOn: day(f.dueOn), assignee: f.assignee, status: f.status, overdue: f.status === "OPEN" && f.dueOn !== null && day(f.dueOn)! < today, doneAt: iso(f.doneAt), doneNote: f.doneNote }));
}

async function reportViews(db: Client, villageId: number, eventId: number, showTitles: boolean): Promise<ReportLinkView[]> {
  const links = await db.securityReportLink.findMany({ where: { villageId, eventId }, orderBy: { id: "asc" }, take: LIMITS.linksPerEvent });
  const reports = links.length && showTitles ? await db.citizenReport.findMany({ where: { villageId, id: { in: links.map((l) => l.citizenReportId) } }, select: { id: true, title: true, status: true, category: true, createdAt: true } }) : [];
  const by = new Map(reports.map((r) => [r.id.toString(), r]));
  return links.map((l) => {
    const r = by.get(l.citizenReportId.toString());
    return { id: l.id, citizenReportId: l.citizenReportId.toString(), title: showTitles ? (r?.title ?? "(pengaduan sudah tidak ada)") : null, status: r?.status ?? null, category: r?.category ?? null, createdAt: r ? r.createdAt.toISOString() : null };
  });
}

export async function getSecurityEvent(db: Client, a: { villageId: number; id: number; detail: boolean; showReports: boolean; today: string; now?: Date }): Promise<Result<SecurityEventDetail>> {
  const r = await inc.getEvent(db, { domain: DOMAIN, villageId: a.villageId, id: a.id, detail: a.detail, now: a.now });
  if (!r.ok) return r;
  const [mediations, followups, reports] = await Promise.all([mediationViews(db, a.villageId, a.id, a.detail), followupViews(db, a.villageId, a.id, a.today), reportViews(db, a.villageId, a.id, a.showReports)]);
  return ok({ ...r.data, mediations, followups, reports });
}

// ---------------------------------------------------------------------------------------------------------------------
// Mediasi
// ---------------------------------------------------------------------------------------------------------------------
async function eventGuard(tx: Db, villageId: number, eventId: number, what: string): Promise<void> {
  const cur = await lockEvent(tx, villageId, DOMAIN, eventId);
  if (!acceptsChildren(cur.status)) stop(`Kejadian sudah ditutup atau dibatalkan, jadi ${what} tidak dapat diubah. Buka kembali penanganan lebih dulu.`);
}

export async function createMediation(db: Client, a: { villageId: number; eventId: number; userId: number | null; input: unknown }): Promise<Result<{ id: number }>> {
  const p = parseMediation(a.input, "create");
  if (!p.ok) return invalid(p);
  const v = p.value;
  return db
    .$transaction(async (tx) => {
      await eventGuard(tx, a.villageId, a.eventId, "mediasi");
      if ((await tx.securityMediation.count({ where: { eventId: a.eventId, villageId: a.villageId } })) >= LIMITS.mediationsPerEvent) return stop(`Mediasi per kejadian maksimal ${LIMITS.mediationsPerEvent}.`);
      const row = await tx.securityMediation.create({ data: { villageId: a.villageId, eventId: a.eventId, scheduledAt: v.scheduledAt!, place: v.place!, mediator: v.mediator!, documentRef: v.documentRef ?? null, note: v.note ?? null, createdById: a.userId }, select: { id: true } });
      return ok({ id: row.id });
    })
    .catch(asResult);
}

/** Memuat mediasi dan mengunci kejadiannya (pernyataan pertama transaksi memakai eventId dari baca awal; data dibaca ulang di dalam kunci). */
async function withMediation<T>(db: Client, villageId: number, id: number, run: (tx: Db, m: { id: number; eventId: number; status: string }) => Promise<Result<T>>): Promise<Result<T>> {
  const pre = await db.securityMediation.findFirst({ where: { id, villageId }, select: { eventId: true } });
  if (!pre) return fail(404, "Mediasi tidak ditemukan.");
  return db
    .$transaction(async (tx) => {
      await eventGuard(tx, villageId, pre.eventId, "mediasi");
      const m = await tx.securityMediation.findFirst({ where: { id, villageId }, select: { id: true, eventId: true, status: true } });
      if (!m) return stop("Mediasi tidak ditemukan.", 404);
      return run(tx, m);
    })
    .catch(asResult);
}

export const patchMediation = (db: Client, a: { villageId: number; id: number; input: unknown }) => {
  const p = parseMediation(a.input, "patch");
  if (!p.ok) return Promise.resolve(invalid(p));
  return withMediation(db, a.villageId, a.id, async (tx, m) => {
    if (m.status !== "SCHEDULED") return stop("Hanya mediasi yang masih dijadwalkan yang dapat diubah.");
    await tx.securityMediation.update({ where: { id: m.id }, data: p.value as never });
    return ok({ eventId: m.eventId, keys: Object.keys(p.value) });
  });
};

export const removeMediation = (db: Client, a: { villageId: number; id: number }) =>
  withMediation(db, a.villageId, a.id, async (tx, m) => {
    if (m.status === "COMPLETED") return stop("Berita acara yang sudah diselesaikan disimpan sebagai arsip dan tidak dapat dihapus.");
    await tx.securityMediation.delete({ where: { id: m.id } });
    return ok({ eventId: m.eventId });
  });

export const cancelMediation = (db: Client, a: { villageId: number; id: number; input: unknown }) => {
  const note = isRecord(a.input) && typeof a.input.note === "string" ? a.input.note.replace(/\s+/g, " ").trim() : "";
  if (note.length < 5) return Promise.resolve(invalid({ errors: ["Tulis alasan pembatalan (minimal 5 karakter)."], fieldErrors: { note: "Tulis alasan pembatalan (minimal 5 karakter)." } }));
  const bad = sensitiveFail({ note });
  if (bad) return Promise.resolve(bad);
  return withMediation(db, a.villageId, a.id, async (tx, m) => {
    if (m.status !== "SCHEDULED") return stop("Hanya mediasi yang masih dijadwalkan yang dapat dibatalkan.");
    await tx.securityMediation.update({ where: { id: m.id }, data: { status: "CANCELLED", note: note.slice(0, 500) } });
    return ok({ eventId: m.eventId });
  });
};

/** Menyelesaikan berita acara: gerbang `mediationGate`, lalu status menjadi COMPLETED (final). */
export const completeMediation = (db: Client, a: { villageId: number; id: number; input: unknown; now?: Date }) => {
  const p = parseMediationComplete(a.input);
  if (!p.ok) return Promise.resolve(invalid(p));
  return withMediation(db, a.villageId, a.id, async (tx, m) => {
    if (m.status !== "SCHEDULED") return stop("Hanya mediasi yang masih dijadwalkan yang dapat diselesaikan.");
    const parties = await tx.securityMediationParty.findMany({ where: { mediationId: m.id }, select: { side: true, attended: true, agrees: true, isMinor: true } });
    const gate = mediationGate(p.value.outcome, parties);
    if (gate) return stop(gate);
    await tx.securityMediation.update({ where: { id: m.id }, data: { status: "COMPLETED", outcome: p.value.outcome, agreement: p.value.agreement, referredTo: p.value.referredTo, scheduledAt: p.value.heldAt ?? undefined } });
    return ok({ eventId: m.eventId, outcome: p.value.outcome });
  });
};

export const addParty = (db: Client, a: { villageId: number; mediationId: number; input: unknown; today: string }) => {
  const p = parseParty(a.input);
  if (!p.ok) return Promise.resolve(invalid(p));
  const v = p.value;
  return withMediation(db, a.villageId, a.mediationId, async (tx, m) => {
    if (m.status !== "SCHEDULED") return stop("Pihak hanya dapat ditambah selama mediasi masih dijadwalkan.");
    if ((await tx.securityMediationParty.count({ where: { mediationId: m.id } })) >= LIMITS.partiesPerMediation) return stop(`Pihak per mediasi maksimal ${LIMITS.partiesPerMediation}.`);
    let name = v.name;
    let isMinor = v.isMinor;
    if (v.residentId) {
      const people = await residentsById(tx, a.villageId, [v.residentId]);
      const person = people.get(v.residentId);
      if (!person) return stop("Warga tidak ditemukan di desa ini.", 404);
      if (await tx.securityMediationParty.findFirst({ where: { mediationId: m.id, residentId: v.residentId }, select: { id: true } })) return stop("Warga ini sudah tercatat sebagai pihak pada mediasi ini.");
      name = person.name;
      isMinor = ageOn(person.birthDate, a.today) < 18;
    }
    const row = await tx.securityMediationParty.create({ data: { villageId: a.villageId, mediationId: m.id, side: v.side, name: name!, residentId: v.residentId, isMinor, attended: v.attended, agrees: v.agrees, note: v.note }, select: { id: true } });
    return ok({ id: row.id, eventId: m.eventId, side: v.side, isMinor });
  });
};

export const patchParty = (db: Client, a: { villageId: number; mediationId: number; id: number; input: unknown }) => {
  const p = parsePartyPatch(a.input);
  if (!p.ok) return Promise.resolve(invalid(p));
  return withMediation(db, a.villageId, a.mediationId, async (tx, m) => {
    if (m.status !== "SCHEDULED") return stop("Pihak hanya dapat diubah selama mediasi masih dijadwalkan.");
    const r = await tx.securityMediationParty.updateMany({ where: { id: a.id, mediationId: m.id, villageId: a.villageId }, data: p.value as never });
    return r.count ? ok({ eventId: m.eventId, keys: Object.keys(p.value) }) : stop("Pihak tidak ditemukan.", 404);
  });
};

export const removeParty = (db: Client, a: { villageId: number; mediationId: number; id: number }) =>
  withMediation(db, a.villageId, a.mediationId, async (tx, m) => {
    if (m.status !== "SCHEDULED") return stop("Pihak hanya dapat dihapus selama mediasi masih dijadwalkan.");
    const r = await tx.securityMediationParty.deleteMany({ where: { id: a.id, mediationId: m.id, villageId: a.villageId } });
    return r.count ? ok({ eventId: m.eventId }) : stop("Pihak tidak ditemukan.", 404);
  });

// ---------------------------------------------------------------------------------------------------------------------
// Tindak lanjut
// ---------------------------------------------------------------------------------------------------------------------
export async function createFollowup(db: Client, a: { villageId: number; eventId: number; userId: number | null; input: unknown }): Promise<Result<{ id: number }>> {
  const p = parseFollowup(a.input);
  if (!p.ok) return invalid(p);
  const v = p.value;
  return db
    .$transaction(async (tx) => {
      await eventGuard(tx, a.villageId, a.eventId, "tindak lanjut");
      if ((await tx.securityFollowup.count({ where: { eventId: a.eventId, villageId: a.villageId } })) >= LIMITS.followupsPerEvent) return stop(`Tindak lanjut per kejadian maksimal ${LIMITS.followupsPerEvent}.`);
      if (v.mediationId !== null && !(await tx.securityMediation.findFirst({ where: { id: v.mediationId, eventId: a.eventId, villageId: a.villageId }, select: { id: true } }))) return stop("Mediasi tidak ditemukan pada kejadian ini.", 404);
      const row = await tx.securityFollowup.create({ data: { villageId: a.villageId, eventId: a.eventId, mediationId: v.mediationId, description: v.description, dueOn: v.dueOn, assignee: v.assignee, createdById: a.userId }, select: { id: true } });
      return ok({ id: row.id });
    })
    .catch(asResult);
}

async function withFollowup<T>(db: Client, villageId: number, id: number, run: (tx: Db, f: { id: number; eventId: number; status: string }) => Promise<Result<T>>): Promise<Result<T>> {
  const pre = await db.securityFollowup.findFirst({ where: { id, villageId }, select: { eventId: true } });
  if (!pre) return fail(404, "Tindak lanjut tidak ditemukan.");
  return db
    .$transaction(async (tx) => {
      await eventGuard(tx, villageId, pre.eventId, "tindak lanjut");
      const f = await tx.securityFollowup.findFirst({ where: { id, villageId }, select: { id: true, eventId: true, status: true } });
      if (!f) return stop("Tindak lanjut tidak ditemukan.", 404);
      return run(tx, f);
    })
    .catch(asResult);
}

export const completeFollowup = (db: Client, a: { villageId: number; id: number; input: unknown; now?: Date }) => {
  const p = parseFollowupDone(a.input);
  if (!p.ok) return Promise.resolve(invalid(p));
  return withFollowup(db, a.villageId, a.id, async (tx, f) => {
    if (f.status === "DONE") return stop("Tindak lanjut ini sudah selesai.");
    await tx.securityFollowup.update({ where: { id: f.id }, data: { status: "DONE", doneAt: a.now ?? new Date(), doneNote: p.value.doneNote } });
    return ok({ eventId: f.eventId });
  });
};

export const removeFollowup = (db: Client, a: { villageId: number; id: number }) =>
  withFollowup(db, a.villageId, a.id, async (tx, f) => {
    if (f.status === "DONE") return stop("Tindak lanjut yang sudah selesai disimpan sebagai riwayat dan tidak dapat dihapus.");
    await tx.securityFollowup.delete({ where: { id: f.id } });
    return ok({ eventId: f.eventId });
  });

// ---------------------------------------------------------------------------------------------------------------------
// Tautan ke Pengaduan warga (baca-saja; isi pengaduan tidak disalin)
// ---------------------------------------------------------------------------------------------------------------------
export interface ReportHit {
  id: string;
  title: string;
  status: string;
  category: string | null;
  createdAt: string;
}

/** Cari Pengaduan desa ini menurut judul (minimal 3 huruf); tanpa nama pelapor atau isi. Pemanggil harus berizin baca Pengaduan. */
export async function searchReports(db: Client, a: { villageId: number; q: string }): Promise<ReportHit[]> {
  const q = likeSafe(a.q);
  if (q.length < 3) return [];
  const rows = await db.citizenReport.findMany({ where: { villageId: a.villageId, title: { contains: q } }, orderBy: { id: "desc" }, take: 10, select: { id: true, title: true, status: true, category: true, createdAt: true } });
  return rows.map((r) => ({ id: r.id.toString(), title: r.title, status: r.status, category: r.category, createdAt: r.createdAt.toISOString() }));
}

export async function addReportLink(db: Client, a: { villageId: number; eventId: number; userId: number | null; input: unknown }): Promise<Result<{ id: number; citizenReportId: string }>> {
  const p = parseReportLink(a.input);
  if (!p.ok) return invalid(p);
  return db
    .$transaction(async (tx) => {
      await eventGuard(tx, a.villageId, a.eventId, "tautan pengaduan");
      if (!(await tx.citizenReport.findFirst({ where: { id: p.value.citizenReportId, villageId: a.villageId }, select: { id: true } }))) return stop("Pengaduan tidak ditemukan di desa ini.", 404);
      if ((await tx.securityReportLink.count({ where: { eventId: a.eventId, villageId: a.villageId } })) >= LIMITS.linksPerEvent) return stop(`Tautan pengaduan per kejadian maksimal ${LIMITS.linksPerEvent}.`);
      try {
        const row = await tx.securityReportLink.create({ data: { villageId: a.villageId, eventId: a.eventId, citizenReportId: p.value.citizenReportId, linkedById: a.userId }, select: { id: true } });
        return ok({ id: row.id, citizenReportId: p.value.citizenReportId.toString() });
      } catch (e) {
        if (P2002(e)) return stop("Pengaduan ini sudah ditautkan ke kejadian ini.");
        throw e;
      }
    })
    .catch(asResult);
}

export async function removeReportLink(db: Client, a: { villageId: number; eventId: number; id: number }): Promise<Result<{ citizenReportId: string }>> {
  return db
    .$transaction(async (tx) => {
      await eventGuard(tx, a.villageId, a.eventId, "tautan pengaduan");
      const l = await tx.securityReportLink.findFirst({ where: { id: a.id, eventId: a.eventId, villageId: a.villageId } });
      if (!l) return stop("Tautan tidak ditemukan.", 404);
      await tx.securityReportLink.delete({ where: { id: l.id } });
      return ok({ citizenReportId: l.citizenReportId.toString() });
    })
    .catch(asResult);
}

// ---------------------------------------------------------------------------------------------------------------------
// Eskalasi catatan ronda menjadi kejadian
// ---------------------------------------------------------------------------------------------------------------------
export async function escalateRondaLog(db: Client, a: { villageId: number; logId: number; userId: number | null; input: unknown; now?: Date }): Promise<Result<{ eventId: number; kind: string }>> {
  if (!isRecord(a.input)) return invalid({ errors: ["Data tidak valid."], fieldErrors: {} });
  const log = await db.securityRondaLog.findFirst({ where: { id: a.logId, villageId: a.villageId }, include: { group: { select: { rt: true, rw: true, hamlet: true, postName: true } } } });
  if (!log) return fail(404, "Catatan tidak ditemukan.");
  if (log.kind !== "TEMUAN") return fail(400, "Hanya catatan berjenis Temuan yang dapat dieskalasi menjadi kejadian.");
  if (log.eventId !== null) return fail(409, "Catatan ini sudah dieskalasi menjadi kejadian.");
  const input = { kind: a.input.kind, title: a.input.title, severity: a.input.severity ?? "MEDIUM", occurredAt: log.loggedAt.toISOString(), description: log.description, rt: log.group.rt, rw: log.group.rw, hamlet: log.group.hamlet, locationText: log.group.postName ? `Pos ${log.group.postName}` : null };
  const created = await createSecurityEvent(db, { villageId: a.villageId, userId: a.userId, input, now: a.now });
  if (!created.ok) return created;
  const claimed = await db.securityRondaLog.updateMany({ where: { id: log.id, villageId: a.villageId, eventId: null }, data: { eventId: created.data.id } });
  if (!claimed.count) {
    // Dua eskalasi serentak: yang kalah membuang kejadian yang baru dibuatnya.
    await removeSecurityEvent(db, { villageId: a.villageId, id: created.data.id });
    return fail(409, "Catatan ini sudah dieskalasi menjadi kejadian.");
  }
  return ok({ eventId: created.data.id, kind: created.data.kind });
}

export const KEAMANAN_KINDS = DOMAIN_DEFS.KEAMANAN.kinds;
