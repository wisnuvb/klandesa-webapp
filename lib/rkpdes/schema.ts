import { cleanText as text, isRecord, parseIsoDate, type Parsed } from "@/lib/form-input";
import { toCents } from "@/lib/coop/loan-math";
import { isKegiatanCode } from "@/lib/apbdes/catalog";
import { isChangeReason, isIncomingLevel, isMethod, isPaguSource, isTeamRole, LIMITS, type ChangeReason, type IncomingLevel, type Method, type PaguSource, type TeamRole } from "./catalog";

const has = (b: Record<string, unknown>, k: string) => Object.prototype.hasOwnProperty.call(b, k);
const blank = (v: unknown) => v === undefined || v === null || v === "";

function posInt(v: unknown): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

/** Rupiah (string/angka) → string desimal 2 digit untuk kolom Decimal, atau null bila kosong. `bad` bila bukan angka rupiah wajar. */
function rupiah(v: unknown): { value: string | null; bad: boolean } {
  if (blank(v)) return { value: null, bad: false };
  const c = toCents(typeof v === "number" ? v : typeof v === "string" ? v : "x");
  if (c === null) return { value: null, bad: true };
  return { value: `${c / 100n}.${String(c % 100n).padStart(2, "0")}`, bad: false };
}

export interface DocumentCreateInput {
  year: number;
  perubahan: boolean;
  changeReason: ChangeReason | null;
}

export function parseDocumentCreate(body: unknown): Parsed<DocumentCreateInput> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };
  const year = Number(body.year);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) fe.year = "Isi tahun RKP Desa antara 2000 dan 2100.";
  const perubahan = body.perubahan === true;
  let changeReason: ChangeReason | null = null;
  if (perubahan) {
    if (isChangeReason(body.changeReason)) changeReason = body.changeReason;
    else fe.changeReason = "Pilih alasan perubahan RKP Desa (Pasal 49).";
  }
  if (Object.keys(fe).length) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return { ok: true, value: { year, perubahan, changeReason } };
}

export interface DocumentPatch {
  musdesMeetingId?: number | null;
  musrenbangMeetingId?: number | null;
  teamFormedAt?: Date | null;
  teamDecreeRef?: string | null;
  paguReceivedAt?: Date | null;
  evaluationText?: string | null;
  draftReadyAt?: Date | null;
  draftMinutesRef?: string | null;
  legalDocumentId?: number | null;
  usulanSubmittedAt?: Date | null;
  usulanRef?: string | null;
}

const DATE_FIELDS = ["teamFormedAt", "paguReceivedAt", "draftReadyAt", "usulanSubmittedAt"] as const;
const REF_FIELDS = [
  ["teamDecreeRef", 150],
  ["draftMinutesRef", 150],
  ["usulanRef", 150],
] as const;
const ID_FIELDS = ["musdesMeetingId", "musrenbangMeetingId", "legalDocumentId"] as const;

export function parseDocumentPatch(body: unknown): Parsed<DocumentPatch> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };
  const out: DocumentPatch = {};
  for (const k of DATE_FIELDS) {
    if (!has(body, k)) continue;
    if (blank(body[k])) out[k] = null;
    else {
      const d = parseIsoDate(body[k]);
      if (!d) fe[k] = "Tanggal tidak valid.";
      else out[k] = d;
    }
  }
  for (const [k, max] of REF_FIELDS) {
    if (!has(body, k)) continue;
    const t = text(body[k], max);
    if (t.bad || t.tooLong) fe[k] = `Maksimal ${max} karakter.`;
    else out[k] = t.value;
  }
  for (const k of ID_FIELDS) {
    if (!has(body, k)) continue;
    if (blank(body[k])) out[k] = null;
    else {
      const n = posInt(body[k]);
      if (!n) fe[k] = "Pilihan tidak valid.";
      else out[k] = n;
    }
  }
  if (has(body, "evaluationText")) {
    const t = text(body.evaluationText, LIMITS.evaluation);
    if (t.bad || t.tooLong) fe.evaluationText = `Evaluasi maksimal ${LIMITS.evaluation} karakter.`;
    else out.evaluationText = t.value;
  }
  if (Object.keys(fe).length) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return { ok: true, value: out };
}

export interface TeamInput {
  residentId: number | null;
  name: string | null;
  role: TeamRole;
  position: string | null;
  gender: "L" | "P" | null;
}

export function parseTeamInput(body: unknown): Parsed<TeamInput> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };
  const residentId = blank(body.residentId) ? null : posInt(body.residentId);
  if (!blank(body.residentId) && residentId === null) fe.residentId = "Warga tidak valid.";
  const name = text(body.name, 150);
  if (name.bad || name.tooLong) fe.name = "Nama maksimal 150 karakter.";
  else if (!name.value && residentId === null) fe.name = "Isi nama atau pilih dari data warga.";
  const role = isTeamRole(body.role) ? body.role : null;
  if (!role) fe.role = "Pilih peran dalam tim.";
  const position = text(body.position, 100);
  if (position.bad || position.tooLong) fe.position = "Jabatan maksimal 100 karakter.";
  let gender: "L" | "P" | null = null;
  if (!blank(body.gender)) {
    if (body.gender === "L" || body.gender === "P") gender = body.gender;
    else fe.gender = "Pilih Laki-laki atau Perempuan.";
  }
  if (Object.keys(fe).length) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return { ok: true, value: { residentId, name: name.value, role: role!, position: position.value, gender } };
}

export interface PaguInput {
  source: PaguSource;
  amountCents: bigint;
  note: string | null;
}

export function parsePaguInput(body: unknown): Parsed<PaguInput> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };
  const source = isPaguSource(body.source) ? body.source : null;
  if (!source) fe.source = "Pilih sumber pagu.";
  const c = blank(body.amount) ? null : toCents(typeof body.amount === "number" ? body.amount : typeof body.amount === "string" ? body.amount : "x");
  if (c === null) fe.amount = "Isi jumlah pagu dalam rupiah (angka, tanpa pemisah ribuan).";
  const note = text(body.note, 200);
  if (note.bad || note.tooLong) fe.note = "Catatan maksimal 200 karakter.";
  if (Object.keys(fe).length) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return { ok: true, value: { source: source!, amountCents: c!, note: note.value } };
}

export interface IncomingInput {
  level: IncomingLevel;
  agency: string | null;
  name: string;
  location: string | null;
  amountCents: bigint | null;
  note: string | null;
}

export function parseIncomingInput(body: unknown): Parsed<IncomingInput> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };
  const level = isIncomingLevel(body.level) ? body.level : null;
  if (!level) fe.level = "Pilih tingkat pemerintah.";
  const name = text(body.name, 200);
  if (name.bad || !name.value) fe.name = "Isi nama program atau kegiatan.";
  else if (name.tooLong) fe.name = "Nama maksimal 200 karakter.";
  const agency = text(body.agency, 150);
  if (agency.bad || agency.tooLong) fe.agency = "Instansi maksimal 150 karakter.";
  const location = text(body.location, 200);
  if (location.bad || location.tooLong) fe.location = "Lokasi maksimal 200 karakter.";
  let amountCents: bigint | null = null;
  if (!blank(body.amount)) {
    amountCents = toCents(typeof body.amount === "number" ? body.amount : typeof body.amount === "string" ? body.amount : "x");
    if (amountCents === null) fe.amount = "Jumlah dalam rupiah, angka saja.";
  }
  const note = text(body.note, 300);
  if (note.bad || note.tooLong) fe.note = "Catatan maksimal 300 karakter.";
  if (Object.keys(fe).length) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return { ok: true, value: { level: level!, agency: agency.value, name: name.value!, location: location.value, amountCents, note: note.value } };
}

export interface ActivityInput {
  title: string;
  description: string | null;
  location: string | null;
  estimatedBudget: string | null;
  activityCode: string | null;
  fundSource: PaguSource | null;
  method: Method | null;
  outputName: string | null;
  outputVolume: string | null;
  outputUnit: string | null;
  executorChair: string | null;
  executorSecretary: string | null;
  executorTreasurer: string | null;
  executorMembers: string | null;
  executorHasWoman: boolean | null;
  rabVerifiedAt: Date | null;
  proposeToRegency: boolean;
}

export function parseActivityInput(body: unknown): Parsed<ActivityInput> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };
  const title = text(body.title, 255);
  if (title.bad || !title.value) fe.title = "Isi nama kegiatan.";
  else if (title.tooLong) fe.title = "Nama kegiatan maksimal 255 karakter.";
  const description = text(body.description, 2000);
  if (description.bad || description.tooLong) fe.description = "Uraian maksimal 2000 karakter.";
  const location = text(body.location, 255);
  if (location.bad || location.tooLong) fe.location = "Lokasi maksimal 255 karakter.";
  const budget = rupiah(body.estimatedBudget);
  if (budget.bad) fe.estimatedBudget = "Anggaran dalam rupiah, angka saja.";

  let activityCode: string | null = null;
  if (!blank(body.activityCode)) {
    if (typeof body.activityCode !== "string" || !isKegiatanCode(body.activityCode)) fe.activityCode = "Pilih kegiatan dari daftar bidang/kegiatan Permendagri 20/2018.";
    else activityCode = body.activityCode;
  }
  let fundSource: PaguSource | null = null;
  if (!blank(body.fundSource)) {
    if (isPaguSource(body.fundSource)) fundSource = body.fundSource;
    else fe.fundSource = "Sumber dana tidak dikenal.";
  }
  let method: Method | null = null;
  if (!blank(body.method)) {
    if (isMethod(body.method)) method = body.method;
    else fe.method = "Cara pelaksanaan tidak dikenal.";
  }
  const outputName = text(body.outputName, 200);
  if (outputName.bad || outputName.tooLong) fe.outputName = "Keluaran maksimal 200 karakter.";
  let outputVolume: string | null = null;
  if (!blank(body.outputVolume)) {
    const s = typeof body.outputVolume === "number" ? String(body.outputVolume) : typeof body.outputVolume === "string" ? body.outputVolume.trim() : "";
    if (!/^\d{1,12}(\.\d{1,2})?$/.test(s) || Number(s) <= 0) fe.outputVolume = "Volume keluaran harus angka lebih dari 0 (maks. 2 desimal).";
    else outputVolume = Number(s).toFixed(2);
  }
  const outputUnit = text(body.outputUnit, 30);
  if (outputUnit.bad || outputUnit.tooLong) fe.outputUnit = "Satuan maksimal 30 karakter.";

  const chair = text(body.executorChair, 150);
  const secretary = text(body.executorSecretary, 150);
  const treasurer = text(body.executorTreasurer, 150);
  if (chair.bad || chair.tooLong) fe.executorChair = "Maksimal 150 karakter.";
  if (secretary.bad || secretary.tooLong) fe.executorSecretary = "Maksimal 150 karakter.";
  if (treasurer.bad || treasurer.tooLong) fe.executorTreasurer = "Maksimal 150 karakter.";
  const members = text(body.executorMembers, 500);
  if (members.bad || members.tooLong) fe.executorMembers = "Anggota pelaksana maksimal 500 karakter.";
  const executorHasWoman = body.executorHasWoman === true ? true : body.executorHasWoman === false ? false : null;

  let rabVerifiedAt: Date | null = null;
  if (!blank(body.rabVerifiedAt)) {
    rabVerifiedAt = parseIsoDate(body.rabVerifiedAt);
    if (!rabVerifiedAt) fe.rabVerifiedAt = "Tanggal verifikasi tidak valid.";
  }

  if (Object.keys(fe).length) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return {
    ok: true,
    value: {
      title: title.value!,
      description: description.value,
      location: location.value,
      estimatedBudget: budget.value,
      activityCode,
      fundSource,
      method,
      outputName: outputName.value,
      outputVolume,
      outputUnit: outputUnit.value,
      executorChair: chair.value,
      executorSecretary: secretary.value,
      executorTreasurer: treasurer.value,
      executorMembers: members.value,
      executorHasWoman,
      rabVerifiedAt,
      proposeToRegency: body.proposeToRegency === true,
    },
  };
}
