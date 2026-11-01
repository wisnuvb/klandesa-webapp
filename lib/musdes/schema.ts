import { cleanText as text, isRecord, parseIsoDate, type Parsed } from "@/lib/form-input";
import { isKind, isUnsur, LIMITS, type MeetingKind, type Unsur } from "./catalog";

export interface MeetingInput {
  kind: MeetingKind;
  title: string;
  topic: string | null;
  planYear: number | null;
  scheduledOn: Date;
  startTime: string | null;
  location: string | null;
  agenda: string | null;
}

export function parseMeetingInput(body: unknown, mode: "create" | "update"): Parsed<MeetingInput> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };

  const kind = isKind(body.kind) ? body.kind : null;
  if (mode === "create" && !kind) fe.kind = "Pilih jenis musyawarah.";

  const title = text(body.title, 200);
  if (title.bad || !title.value) fe.title = "Isi judul musyawarah.";
  else if (title.tooLong) fe.title = "Judul maksimal 200 karakter.";

  const topic = text(body.topic, 300);
  if (topic.bad || topic.tooLong) fe.topic = "Pokok bahasan maksimal 300 karakter.";

  let planYear: number | null = null;
  if (body.planYear !== undefined && body.planYear !== null && body.planYear !== "") {
    const n = Number(body.planYear);
    if (!Number.isInteger(n) || n < 2000 || n > 2100) fe.planYear = "Tahun rencana antara 2000 dan 2100.";
    else planYear = n;
  }

  const scheduledOn = parseIsoDate(body.scheduledOn);
  if (!scheduledOn) fe.scheduledOn = "Isi tanggal musyawarah yang benar.";

  let startTime: string | null = null;
  if (body.startTime !== undefined && body.startTime !== null && body.startTime !== "") {
    if (typeof body.startTime !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.startTime)) fe.startTime = "Jam dengan format 24 jam, mis. 19:30.";
    else startTime = body.startTime;
  }

  const location = text(body.location, 200);
  if (location.bad || location.tooLong) fe.location = "Tempat maksimal 200 karakter.";
  const agenda = text(body.agenda, LIMITS.agenda);
  if (agenda.bad || agenda.tooLong) fe.agenda = `Acara maksimal ${LIMITS.agenda} karakter.`;

  if (Object.keys(fe).length) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return {
    ok: true,
    value: { kind: kind ?? ("MUSDES_LAINNYA" as MeetingKind), title: title.value!, topic: topic.value, planYear, scheduledOn: scheduledOn!, startTime, location: location.value, agenda: agenda.value },
  };
}

export interface AttendeeInput {
  residentId: number | null;
  name: string | null;
  unsur: Unsur;
  gender: "L" | "P" | null;
  present: boolean;
  note: string | null;
}

export function parseAttendeeInput(body: unknown): Parsed<AttendeeInput> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };

  let residentId: number | null = null;
  if (body.residentId !== undefined && body.residentId !== null && body.residentId !== "") {
    const n = Number(body.residentId);
    if (!Number.isInteger(n) || n < 1) fe.residentId = "Warga tidak valid.";
    else residentId = n;
  }
  const name = text(body.name, 150);
  if (name.bad || name.tooLong) fe.name = "Nama maksimal 150 karakter.";
  else if (!name.value && residentId === null) fe.name = "Isi nama peserta atau pilih dari data warga.";

  const unsur = isUnsur(body.unsur) ? body.unsur : null;
  if (!unsur) fe.unsur = "Pilih unsur peserta.";

  let gender: "L" | "P" | null = null;
  if (body.gender !== undefined && body.gender !== null && body.gender !== "") {
    if (body.gender === "L" || body.gender === "P") gender = body.gender;
    else fe.gender = "Pilih Laki-laki atau Perempuan.";
  }
  const present = body.present === true;
  const note = text(body.note, 200);
  if (note.bad || note.tooLong) fe.note = "Catatan maksimal 200 karakter.";

  if (Object.keys(fe).length) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return { ok: true, value: { residentId, name: name.value, unsur: unsur!, gender, present, note: note.value } };
}

export interface DecisionInput {
  text: string;
  refType: string | null;
  refId: number | null;
}

export function parseDecisionInput(body: unknown): Parsed<DecisionInput> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };
  const t = text(body.text, 1000);
  if (t.bad || !t.value) fe.text = "Isi bunyi keputusan.";
  else if (t.tooLong) fe.text = "Keputusan maksimal 1000 karakter.";
  const refType = text(body.refType, 30);
  if (refType.bad || refType.tooLong) fe.refType = "Jenis rujukan maksimal 30 karakter.";
  let refId: number | null = null;
  if (body.refId !== undefined && body.refId !== null && body.refId !== "") {
    const n = Number(body.refId);
    if (!Number.isInteger(n) || n < 1) fe.refId = "Rujukan tidak valid.";
    else refId = n;
  }
  if (Object.keys(fe).length) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return { ok: true, value: { text: t.value!, refType: refType.value, refId } };
}

export interface MinutesInput {
  minutesNo: string | null;
  minutesText: string | null;
  heldOn: Date | null;
}

export function parseMinutesInput(body: unknown): Parsed<MinutesInput> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };
  const no = text(body.minutesNo, 100);
  if (no.bad || no.tooLong) fe.minutesNo = "Nomor berita acara maksimal 100 karakter.";
  const t = text(body.minutesText, LIMITS.minutes);
  if (t.bad || t.tooLong) fe.minutesText = `Berita acara maksimal ${LIMITS.minutes} karakter.`;
  let heldOn: Date | null = null;
  if (body.heldOn !== undefined && body.heldOn !== null && body.heldOn !== "") {
    heldOn = parseIsoDate(body.heldOn);
    if (!heldOn) fe.heldOn = "Tanggal pelaksanaan tidak valid.";
  }
  if (Object.keys(fe).length) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return { ok: true, value: { minutesNo: no.value, minutesText: t.value, heldOn } };
}
