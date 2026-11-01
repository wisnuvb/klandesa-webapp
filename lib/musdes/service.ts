import { Prisma, type PrismaClient } from "@prisma/client";
import { fail, invalid, isoDay, type Result } from "@/lib/form-input";
import { inclusionWarnings } from "./inclusion";
import { isKind, KINDS, LIMITS, STATUS, UNSUR, type MeetingKind, type MeetingStatus } from "./catalog";
import { parseAttendeeInput, parseDecisionInput, parseMeetingInput, parseMinutesInput } from "./schema";

export type { Result };
type Db = Prisma.TransactionClient;

type MeetingRow = Prisma.VillageMeetingGetPayload<object>;
type AttendeeRow = Prisma.VillageMeetingAttendeeGetPayload<object>;
type DecisionRow = Prisma.VillageMeetingDecisionGetPayload<object>;

const EDITABLE_ATTENDEES: MeetingStatus[] = ["PLANNED", "HELD"];

export function serializeMeeting(m: MeetingRow) {
  const kind = isKind(m.kind) ? m.kind : "MUSDES_LAINNYA";
  return {
    id: m.id,
    kind: m.kind,
    kindLabel: KINDS[kind].label,
    basis: KINDS[kind].basis,
    organizer: KINDS[kind].organizer,
    title: m.title,
    topic: m.topic,
    planYear: m.planYear,
    scheduledOn: isoDay(m.scheduledOn),
    startTime: m.startTime,
    location: m.location,
    agenda: m.agenda,
    status: m.status,
    statusLabel: STATUS[m.status as MeetingStatus] ?? m.status,
    heldOn: isoDay(m.heldOn),
    minutesNo: m.minutesNo,
    minutesText: m.minutesText,
    finalizedAt: m.finalizedAt ? m.finalizedAt.toISOString() : null,
    cancelReason: m.cancelReason,
    updatedAt: m.updatedAt.toISOString(),
  };
}
export type MeetingView = ReturnType<typeof serializeMeeting>;

const serializeAttendee = (a: AttendeeRow) => ({
  id: a.id,
  residentId: a.residentId,
  name: a.name,
  unsur: a.unsur,
  unsurLabel: UNSUR[a.unsur as keyof typeof UNSUR] ?? a.unsur,
  gender: a.gender,
  present: a.present,
  note: a.note,
});
export type AttendeeView = ReturnType<typeof serializeAttendee>;

const serializeDecision = (d: DecisionRow, index: number) => ({ id: d.id, no: index + 1, text: d.text, refType: d.refType, refId: d.refId });
export type DecisionView = ReturnType<typeof serializeDecision>;

/** Kunci baris musyawarah. HARUS pernyataan pertama dalam transaksi (MySQL REPEATABLE READ). */
async function lockMeeting(tx: Db, villageId: number, id: number): Promise<MeetingRow | null> {
  await tx.$queryRaw`SELECT id FROM village_meetings WHERE id = ${id} AND villageId = ${villageId} FOR UPDATE`;
  return tx.villageMeeting.findFirst({ where: { id, villageId } });
}

const NOT_FOUND = () => fail(404, "Musyawarah tidak ditemukan.");
const LOCKED = (m: MeetingRow) => fail(409, m.status === "FINAL" ? "Berita acara sudah final dan terkunci. Buka kembali dahulu bila perlu koreksi." : "Musyawarah ini sudah dibatalkan.");

export async function listMeetings(db: Db, villageId: number, f: { kind?: string; status?: string; year?: number; page: number; pageSize: number }) {
  const where: Prisma.VillageMeetingWhereInput = { villageId };
  if (f.kind && isKind(f.kind)) where.kind = f.kind;
  if (f.status && f.status in STATUS) where.status = f.status;
  if (f.year) where.OR = [{ planYear: f.year }, { scheduledOn: { gte: new Date(`${f.year}-01-01T00:00:00.000Z`), lt: new Date(`${f.year + 1}-01-01T00:00:00.000Z`) } }];
  const [rows, total] = await Promise.all([
    db.villageMeeting.findMany({ where, orderBy: [{ scheduledOn: "desc" }, { id: "desc" }], skip: (f.page - 1) * f.pageSize, take: f.pageSize, include: { _count: { select: { attendees: true, decisions: true } } } }),
    db.villageMeeting.count({ where }),
  ]);
  return {
    meetings: rows.map((m) => ({ ...serializeMeeting(m), attendeeCount: m._count.attendees, decisionCount: m._count.decisions })),
    total,
    page: f.page,
    pageSize: f.pageSize,
  };
}

export async function getMeeting(db: Db, villageId: number, id: number) {
  const m = await db.villageMeeting.findFirst({ where: { id, villageId }, include: { attendees: { orderBy: { id: "asc" } }, decisions: { orderBy: { seq: "asc" } } } });
  if (!m) return null;
  const kind = (isKind(m.kind) ? m.kind : "MUSDES_LAINNYA") as MeetingKind;
  const onlyPresent = m.status === "HELD" || m.status === "FINAL";
  const attendees = m.attendees.map(serializeAttendee);
  return {
    meeting: serializeMeeting(m),
    attendees,
    decisions: m.decisions.map(serializeDecision),
    counts: { invited: attendees.length, present: attendees.filter((a) => a.present).length, women: attendees.filter((a) => a.present && a.gender === "P").length },
    warnings: m.status === "CANCELLED" ? [] : inclusionWarnings(kind, attendees, { onlyPresent }),
  };
}

export async function createMeeting(db: PrismaClient, args: { villageId: number; userId: number | null; input: unknown }): Promise<Result<{ id: number }>> {
  const p = parseMeetingInput(args.input, "create");
  if (!p.ok) return invalid(p);
  const count = await db.villageMeeting.count({ where: { villageId: args.villageId } });
  if (count >= LIMITS.meetingsPerVillage) return fail(409, `Maksimal ${LIMITS.meetingsPerVillage} musyawarah per desa.`);
  const row = await db.villageMeeting.create({ data: { villageId: args.villageId, ...p.value, createdById: args.userId } });
  return { ok: true, data: { id: row.id } };
}

export async function updateMeeting(db: PrismaClient, args: { villageId: number; id: number; input: unknown }): Promise<Result<{ id: number }>> {
  const p = parseMeetingInput(args.input, "update");
  if (!p.ok) return invalid(p);
  return db.$transaction(async (tx) => {
    const m = await lockMeeting(tx, args.villageId, args.id);
    if (!m) return NOT_FOUND();
    if (m.status === "FINAL" || m.status === "CANCELLED") return LOCKED(m);
    const { kind: _ignored, ...rest } = p.value;
    void _ignored; // jenis musyawarah tidak boleh diubah setelah dibuat agar rujukan dan aturan keterwakilan tetap konsisten
    await tx.villageMeeting.update({ where: { id: m.id }, data: rest });
    return { ok: true as const, data: { id: m.id } };
  });
}

export async function deleteMeeting(db: PrismaClient, args: { villageId: number; id: number }): Promise<Result<{ id: number }>> {
  return db.$transaction(async (tx) => {
    const m = await lockMeeting(tx, args.villageId, args.id);
    if (!m) return NOT_FOUND();
    if (m.status !== "PLANNED" && m.status !== "CANCELLED") return fail(409, "Hanya musyawarah yang masih dijadwalkan atau dibatalkan yang boleh dihapus. Yang sudah terlaksana adalah catatan resmi.");
    await tx.villageMeeting.delete({ where: { id: m.id } });
    return { ok: true as const, data: { id: m.id } };
  });
}

type Action = "held" | "cancel" | "minutes" | "finalize" | "reopen" | "all-present";

export async function transition(
  db: PrismaClient,
  args: { villageId: number; id: number; userId: number | null; action: Action; input?: unknown },
): Promise<Result<{ status: string; warnings: ReturnType<typeof inclusionWarnings> }>> {
  return db.$transaction(async (tx) => {
    const m = await lockMeeting(tx, args.villageId, args.id);
    if (!m) return NOT_FOUND();
    const kind = (isKind(m.kind) ? m.kind : "MUSDES_LAINNYA") as MeetingKind;
    const out = async (status: string) => {
      const att = await tx.villageMeetingAttendee.findMany({ where: { meetingId: m.id }, select: { unsur: true, gender: true, present: true } });
      return { ok: true as const, data: { status, warnings: inclusionWarnings(kind, att, { onlyPresent: status === "HELD" || status === "FINAL" }) } };
    };
    const body = (args.input ?? {}) as Record<string, unknown>;

    switch (args.action) {
      case "held": {
        if (m.status !== "PLANNED") return fail(409, "Hanya musyawarah yang dijadwalkan yang dapat ditandai terlaksana.");
        const p = parseMinutesInput({ heldOn: body.heldOn });
        if (!p.ok) return invalid(p);
        await tx.villageMeeting.update({ where: { id: m.id }, data: { status: "HELD", heldOn: p.value.heldOn ?? m.scheduledOn } });
        return out("HELD");
      }
      case "cancel": {
        if (m.status !== "PLANNED") return fail(409, "Hanya musyawarah yang masih dijadwalkan yang dapat dibatalkan.");
        const reason = typeof body.reason === "string" ? body.reason.replace(/\s+/g, " ").trim() : "";
        if (reason.length < 5) return fail(400, "Isi alasan pembatalan (minimal 5 karakter).");
        await tx.villageMeeting.update({ where: { id: m.id }, data: { status: "CANCELLED", cancelReason: reason.slice(0, 300) } });
        return out("CANCELLED");
      }
      case "minutes": {
        if (m.status !== "HELD") return fail(409, m.status === "FINAL" || m.status === "CANCELLED" ? LOCKED(m).errors[0] : "Berita acara disusun setelah musyawarah ditandai terlaksana.");
        const p = parseMinutesInput(body);
        if (!p.ok) return invalid(p);
        await tx.villageMeeting.update({ where: { id: m.id }, data: { minutesNo: p.value.minutesNo, minutesText: p.value.minutesText, ...(p.value.heldOn ? { heldOn: p.value.heldOn } : {}) } });
        return out("HELD");
      }
      case "all-present": {
        if (!EDITABLE_ATTENDEES.includes(m.status as MeetingStatus)) return LOCKED(m);
        await tx.villageMeetingAttendee.updateMany({ where: { meetingId: m.id }, data: { present: body.present !== false } });
        return out(m.status);
      }
      case "finalize": {
        if (m.status !== "HELD") return fail(409, m.status === "FINAL" ? "Berita acara sudah final." : "Tandai musyawarah terlaksana dan susun berita acara lebih dahulu.");
        if (!m.minutesText || m.minutesText.trim().length < 20) return fail(400, "Isi berita acara terlebih dahulu (minimal 20 karakter).");
        const present = await tx.villageMeetingAttendee.count({ where: { meetingId: m.id, present: true } });
        if (present < 1) return fail(400, "Tandai minimal satu peserta yang hadir sebelum berita acara difinalkan.");
        await tx.villageMeeting.update({ where: { id: m.id }, data: { status: "FINAL", finalizedAt: new Date(), finalizedById: args.userId } });
        return out("FINAL");
      }
      case "reopen": {
        if (m.status !== "FINAL") return fail(409, "Hanya berita acara yang sudah final yang dapat dibuka kembali.");
        const reason = typeof body.reason === "string" ? body.reason.replace(/\s+/g, " ").trim() : "";
        if (reason.length < 5) return fail(400, "Isi alasan membuka kembali berita acara (minimal 5 karakter).");
        await tx.villageMeeting.update({ where: { id: m.id }, data: { status: "HELD", finalizedAt: null, finalizedById: null } });
        return out("HELD");
      }
    }
  });
}

export async function addAttendees(
  db: PrismaClient,
  args: { villageId: number; meetingId: number; input: unknown },
): Promise<Result<{ added: number }>> {
  const p = parseAttendeeInput(args.input);
  if (!p.ok) return invalid(p);
  return db.$transaction(async (tx) => {
    const m = await lockMeeting(tx, args.villageId, args.meetingId);
    if (!m) return NOT_FOUND();
    if (!EDITABLE_ATTENDEES.includes(m.status as MeetingStatus)) return LOCKED(m);
    const existing = await tx.villageMeetingAttendee.count({ where: { meetingId: m.id } });
    if (existing + 1 > LIMITS.attendeesPerMeeting) return fail(409, `Maksimal ${LIMITS.attendeesPerMeeting} peserta per musyawarah.`);
    let name = p.value.name;
    let gender = p.value.gender;
    if (p.value.residentId !== null) {
      const r = await tx.resident.findFirst({ where: { id: p.value.residentId, villageId: args.villageId }, select: { name: true, gender: true } });
      if (!r) return fail(400, "Warga tidak ditemukan di desa ini.");
      name = name ?? r.name;
      gender = gender ?? (r.gender === "Perempuan" ? "P" : r.gender === "Laki-laki" ? "L" : null);
      const dup = await tx.villageMeetingAttendee.findFirst({ where: { meetingId: m.id, residentId: p.value.residentId }, select: { id: true } });
      if (dup) return fail(409, "Warga ini sudah tercatat sebagai peserta.");
    }
    await tx.villageMeetingAttendee.create({ data: { meetingId: m.id, residentId: p.value.residentId, name: name!, unsur: p.value.unsur, gender, present: p.value.present, note: p.value.note } });
    return { ok: true as const, data: { added: 1 } };
  });
}

/** Tambah banyak peserta sekaligus dari daftar nama (satu nama per baris) dengan unsur yang sama. */
export async function addAttendeesBulk(
  db: PrismaClient,
  args: { villageId: number; meetingId: number; names: unknown; unsur: unknown; present?: boolean },
): Promise<Result<{ added: number }>> {
  if (!Array.isArray(args.names)) return fail(400, "Daftar nama tidak valid.");
  const names = args.names.map((n) => (typeof n === "string" ? n.replace(/\s+/g, " ").trim() : "")).filter(Boolean);
  if (!names.length) return fail(400, "Isi minimal satu nama.");
  if (names.length > LIMITS.bulkAttendees) return fail(400, `Maksimal ${LIMITS.bulkAttendees} nama sekali tambah.`);
  if (names.some((n) => n.length > 150)) return fail(400, "Setiap nama maksimal 150 karakter.");
  const check = parseAttendeeInput({ name: names[0], unsur: args.unsur });
  if (!check.ok) return invalid(check);
  return db.$transaction(async (tx) => {
    const m = await lockMeeting(tx, args.villageId, args.meetingId);
    if (!m) return NOT_FOUND();
    if (!EDITABLE_ATTENDEES.includes(m.status as MeetingStatus)) return LOCKED(m);
    const existing = await tx.villageMeetingAttendee.count({ where: { meetingId: m.id } });
    if (existing + names.length > LIMITS.attendeesPerMeeting) return fail(409, `Maksimal ${LIMITS.attendeesPerMeeting} peserta per musyawarah.`);
    await tx.villageMeetingAttendee.createMany({ data: names.map((name) => ({ meetingId: m.id, name, unsur: check.value.unsur, present: args.present === true })) });
    return { ok: true as const, data: { added: names.length } };
  });
}

export async function updateAttendee(db: PrismaClient, args: { villageId: number; meetingId: number; attendeeId: number; input: unknown }): Promise<Result<{ id: number }>> {
  const p = parseAttendeeInput(args.input);
  if (!p.ok) return invalid(p);
  return db.$transaction(async (tx) => {
    const m = await lockMeeting(tx, args.villageId, args.meetingId);
    if (!m) return NOT_FOUND();
    if (!EDITABLE_ATTENDEES.includes(m.status as MeetingStatus)) return LOCKED(m);
    const a = await tx.villageMeetingAttendee.findFirst({ where: { id: args.attendeeId, meetingId: m.id } });
    if (!a) return fail(404, "Peserta tidak ditemukan.");
    await tx.villageMeetingAttendee.update({ where: { id: a.id }, data: { name: p.value.name ?? a.name, unsur: p.value.unsur, gender: p.value.gender, present: p.value.present, note: p.value.note } });
    return { ok: true as const, data: { id: a.id } };
  });
}

export async function removeAttendee(db: PrismaClient, args: { villageId: number; meetingId: number; attendeeId: number }): Promise<Result<{ id: number }>> {
  return db.$transaction(async (tx) => {
    const m = await lockMeeting(tx, args.villageId, args.meetingId);
    if (!m) return NOT_FOUND();
    if (!EDITABLE_ATTENDEES.includes(m.status as MeetingStatus)) return LOCKED(m);
    const r = await tx.villageMeetingAttendee.deleteMany({ where: { id: args.attendeeId, meetingId: m.id } });
    if (r.count === 0) return fail(404, "Peserta tidak ditemukan.");
    return { ok: true as const, data: { id: args.attendeeId } };
  });
}

export async function addDecision(db: PrismaClient, args: { villageId: number; meetingId: number; input: unknown }): Promise<Result<{ id: number }>> {
  const p = parseDecisionInput(args.input);
  if (!p.ok) return invalid(p);
  return db.$transaction(async (tx) => {
    const m = await lockMeeting(tx, args.villageId, args.meetingId);
    if (!m) return NOT_FOUND();
    if (m.status !== "HELD") return m.status === "FINAL" || m.status === "CANCELLED" ? LOCKED(m) : fail(409, "Keputusan dicatat setelah musyawarah ditandai terlaksana.");
    const agg = await tx.villageMeetingDecision.aggregate({ where: { meetingId: m.id }, _max: { seq: true }, _count: true });
    if (agg._count >= LIMITS.decisionsPerMeeting) return fail(409, `Maksimal ${LIMITS.decisionsPerMeeting} keputusan per musyawarah.`);
    const row = await tx.villageMeetingDecision.create({ data: { meetingId: m.id, seq: (agg._max.seq ?? 0) + 1, ...p.value } });
    return { ok: true as const, data: { id: row.id } };
  });
}

export async function updateDecision(db: PrismaClient, args: { villageId: number; meetingId: number; decisionId: number; input: unknown }): Promise<Result<{ id: number }>> {
  const p = parseDecisionInput(args.input);
  if (!p.ok) return invalid(p);
  return db.$transaction(async (tx) => {
    const m = await lockMeeting(tx, args.villageId, args.meetingId);
    if (!m) return NOT_FOUND();
    if (m.status !== "HELD") return m.status === "FINAL" || m.status === "CANCELLED" ? LOCKED(m) : fail(409, "Keputusan dicatat setelah musyawarah ditandai terlaksana.");
    const r = await tx.villageMeetingDecision.updateMany({ where: { id: args.decisionId, meetingId: m.id }, data: p.value });
    if (r.count === 0) return fail(404, "Keputusan tidak ditemukan.");
    return { ok: true as const, data: { id: args.decisionId } };
  });
}

export async function removeDecision(db: PrismaClient, args: { villageId: number; meetingId: number; decisionId: number }): Promise<Result<{ id: number }>> {
  return db.$transaction(async (tx) => {
    const m = await lockMeeting(tx, args.villageId, args.meetingId);
    if (!m) return NOT_FOUND();
    if (m.status !== "HELD") return m.status === "FINAL" || m.status === "CANCELLED" ? LOCKED(m) : fail(409, "Keputusan dicatat setelah musyawarah ditandai terlaksana.");
    const r = await tx.villageMeetingDecision.deleteMany({ where: { id: args.decisionId, meetingId: m.id } });
    if (r.count === 0) return fail(404, "Keputusan tidak ditemukan.");
    return { ok: true as const, data: { id: args.decisionId } };
  });
}
