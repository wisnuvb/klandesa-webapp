import { cleanText as text, isRecord, parseIsoDate, type Parsed } from "@/lib/form-input";
import { toCents } from "@/lib/coop/loan-math";
import { isKegiatanCode } from "@/lib/apbdes/catalog";
import { isMethod, isPaguSource } from "@/lib/rkpdes/catalog";
import { isChangeReason, isFieldCode, isTeamRole, LIMITS, type ChangeReason, type FieldCode, type TeamRole } from "./catalog";

const has = (b: Record<string, unknown>, k: string) => Object.prototype.hasOwnProperty.call(b, k);
const blank = (v: unknown) => v === undefined || v === null || v === "";
const posInt = (v: unknown): number | null => {
  const n = typeof v === "string" && /^\d+$/.test(v) ? Number(v) : v;
  return typeof n === "number" && Number.isInteger(n) && n >= 1 ? n : null;
};
const yearOk = (v: unknown): number | null => {
  const n = typeof v === "string" && /^\d{4}$/.test(v.trim()) ? Number(v) : v;
  return typeof n === "number" && Number.isInteger(n) && n >= 2000 && n <= 2100 ? n : null;
};

export interface PlanCreateInput {
  title: string;
  periodStart: number;
  periodEnd: number;
  headInauguratedOn: Date | null;
}

export function parsePlanCreate(body: unknown): Parsed<PlanCreateInput> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };
  const title = text(body.title, 255);
  if (title.bad || !title.value) fe.title = "Isi judul RPJM Desa.";
  else if (title.tooLong) fe.title = "Judul maksimal 255 karakter.";
  const periodStart = yearOk(body.periodStart);
  if (!periodStart) fe.periodStart = "Isi tahun awal antara 2000 dan 2100.";
  let periodEnd = blank(body.periodEnd) && periodStart ? periodStart + 7 : yearOk(body.periodEnd);
  if (!periodEnd) fe.periodEnd = "Isi tahun akhir antara 2000 dan 2100.";
  if (periodStart && periodEnd) {
    if (periodEnd < periodStart) fe.periodEnd = "Tahun akhir tidak boleh sebelum tahun awal.";
    else if (periodEnd - periodStart + 1 > LIMITS.maxPeriodYears) fe.periodEnd = `Periode maksimal ${LIMITS.maxPeriodYears} tahun.`;
  }
  let headInauguratedOn: Date | null = null;
  if (!blank(body.headInauguratedOn)) {
    headInauguratedOn = parseIsoDate(body.headInauguratedOn);
    if (!headInauguratedOn) fe.headInauguratedOn = "Tanggal pelantikan tidak valid.";
  }
  if (Object.keys(fe).length) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  periodEnd = periodEnd!;
  return { ok: true, value: { title: title.value!, periodStart: periodStart!, periodEnd, headInauguratedOn } };
}

export interface PlanPatch {
  title?: string;
  periodStart?: number;
  periodEnd?: number;
  vision?: string | null;
  mission?: string | null;
  policyDirection?: string | null;
  headInauguratedOn?: Date | null;
  teamFormedAt?: Date | null;
  teamDecreeRef?: string | null;
  reviewDoneAt?: Date | null;
  reviewMinutesRef?: string | null;
  reviewSummary?: string | null;
  musdesMeetingId?: number | null;
  draftMeetingId?: number | null;
  draftReadyAt?: Date | null;
  draftMinutesRef?: string | null;
  legalDocumentId?: number | null;
  enactedBeforeApp?: boolean;
  /** Alasan mencatat Perdes sebagai sudah ada sebelum aplikasi (wajib bila enactedBeforeApp=true; bukan kolom basis data). */
  enactedReason?: string | null;
  sdgsPlanRecordedAt?: Date | null;
  sdgsPlanNote?: string | null;
}

const DATE_FIELDS = ["headInauguratedOn", "teamFormedAt", "reviewDoneAt", "draftReadyAt", "sdgsPlanRecordedAt"] as const;
const REF_FIELDS = [
  ["teamDecreeRef", 150],
  ["reviewMinutesRef", 150],
  ["draftMinutesRef", 150],
  ["sdgsPlanNote", 300],
] as const;
const LONG_FIELDS = ["vision", "mission", "policyDirection", "reviewSummary"] as const;
const LONG_LABEL: Record<(typeof LONG_FIELDS)[number], string> = { vision: "Visi", mission: "Misi", policyDirection: "Arah kebijakan", reviewSummary: "Ringkasan pengkajian" };
const ID_FIELDS = ["musdesMeetingId", "draftMeetingId", "legalDocumentId"] as const;

export function parsePlanPatch(body: unknown): Parsed<PlanPatch> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };
  const out: PlanPatch = {};
  if (has(body, "title")) {
    const t = text(body.title, 255);
    if (t.bad || !t.value) fe.title = "Isi judul RPJM Desa.";
    else if (t.tooLong) fe.title = "Judul maksimal 255 karakter.";
    else out.title = t.value;
  }
  for (const k of ["periodStart", "periodEnd"] as const) {
    if (!has(body, k)) continue;
    const y = yearOk(body[k]);
    if (!y) fe[k] = "Isi tahun antara 2000 dan 2100.";
    else out[k] = y;
  }
  if (out.periodStart !== undefined && out.periodEnd !== undefined && !fe.periodStart && !fe.periodEnd) {
    if (out.periodEnd < out.periodStart) fe.periodEnd = "Tahun akhir tidak boleh sebelum tahun awal.";
    else if (out.periodEnd - out.periodStart + 1 > LIMITS.maxPeriodYears) fe.periodEnd = `Periode maksimal ${LIMITS.maxPeriodYears} tahun.`;
  }
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
  for (const k of LONG_FIELDS) {
    if (!has(body, k)) continue;
    // Isi panjang: spasi dalam dan baris baru dipertahankan (hanya ujung dirapikan).
    const raw = body[k];
    if (raw === null || raw === undefined) out[k] = null;
    else if (typeof raw !== "string") fe[k] = `${LONG_LABEL[k]} tidak valid.`;
    else if (raw.length > LIMITS.text) fe[k] = `${LONG_LABEL[k]} maksimal ${LIMITS.text} karakter.`;
    else out[k] = raw.trim() === "" ? null : raw.trim();
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
  if (has(body, "enactedBeforeApp")) {
    if (typeof body.enactedBeforeApp === "boolean") out.enactedBeforeApp = body.enactedBeforeApp;
    else fe.enactedBeforeApp = "Pilihan tidak valid.";
  }
  if (has(body, "enactedReason")) {
    const t = text(body.enactedReason, 300);
    if (t.bad || t.tooLong) fe.enactedReason = "Alasan maksimal 300 karakter.";
    else out.enactedReason = t.value;
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

export interface ProgramInput {
  fieldCode: FieldCode;
  year: number;
  title: string;
  description: string | null;
  activityCode: string | null;
  location: string | null;
  outputVolume: string | null;
  outputUnit: string | null;
  benefit: string | null;
  budgetCents: bigint | null;
  fundSource: string | null;
  method: string | null;
}

export function parseProgramInput(body: unknown): Parsed<ProgramInput> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };
  const fieldCode = isFieldCode(body.fieldCode) ? body.fieldCode : null;
  if (!fieldCode) fe.fieldCode = "Pilih bidang.";
  const year = yearOk(body.year);
  if (!year) fe.year = "Isi tahun pelaksanaan antara 2000 dan 2100.";
  const title = text(body.title, 255);
  if (title.bad || !title.value) fe.title = "Isi nama program atau kegiatan.";
  else if (title.tooLong) fe.title = "Nama maksimal 255 karakter.";
  const description = text(body.description, LIMITS.programDescription);
  if (description.bad || description.tooLong) fe.description = `Uraian maksimal ${LIMITS.programDescription} karakter.`;
  let activityCode: string | null = null;
  if (!blank(body.activityCode)) {
    if (typeof body.activityCode !== "string" || !isKegiatanCode(body.activityCode)) fe.activityCode = "Pilih kegiatan dari daftar bidang/kegiatan Permendagri 20/2018.";
    else if (fieldCode && body.activityCode[0] !== fieldCode) fe.activityCode = "Kode kegiatan harus berada pada bidang yang sama dengan bidang yang dipilih.";
    else activityCode = body.activityCode;
  }
  const location = text(body.location, 255);
  if (location.bad || location.tooLong) fe.location = "Lokasi maksimal 255 karakter.";
  let outputVolume: string | null = null;
  if (!blank(body.outputVolume)) {
    const s = typeof body.outputVolume === "number" ? String(body.outputVolume) : typeof body.outputVolume === "string" ? body.outputVolume.trim() : "";
    if (!/^\d{1,12}(\.\d{1,2})?$/.test(s) || Number(s) <= 0) fe.outputVolume = "Volume harus angka lebih dari 0 (maks. 2 desimal).";
    else outputVolume = Number(s).toFixed(2);
  }
  const outputUnit = text(body.outputUnit, 30);
  if (outputUnit.bad || outputUnit.tooLong) fe.outputUnit = "Satuan maksimal 30 karakter.";
  const benefit = text(body.benefit, 300);
  if (benefit.bad || benefit.tooLong) fe.benefit = "Sasaran/manfaat maksimal 300 karakter.";
  let budgetCents: bigint | null = null;
  if (!blank(body.budget)) {
    budgetCents = toCents(typeof body.budget === "number" ? body.budget : typeof body.budget === "string" ? body.budget : "x");
    if (budgetCents === null) fe.budget = "Anggaran dalam rupiah, angka saja.";
  }
  let fundSource: string | null = null;
  if (!blank(body.fundSource)) {
    if (isPaguSource(body.fundSource)) fundSource = body.fundSource;
    else fe.fundSource = "Sumber dana tidak dikenal.";
  }
  let method: string | null = null;
  if (!blank(body.method)) {
    if (isMethod(body.method)) method = body.method;
    else fe.method = "Pola pelaksanaan tidak dikenal.";
  }
  if (Object.keys(fe).length) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return {
    ok: true,
    value: { fieldCode: fieldCode!, year: year!, title: title.value!, description: description.value, activityCode, location: location.value, outputVolume, outputUnit: outputUnit.value, benefit: benefit.value, budgetCents, fundSource, method },
  };
}

export interface ReopenInput {
  reason: ChangeReason;
  note: string;
}

export function parseReopen(body: unknown): Parsed<ReopenInput> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };
  const reason = isChangeReason(body.reason) ? body.reason : null;
  if (!reason) fe.reason = "Pilih alasan perubahan (Pasal 28 ayat 1 / PP 16/2026 Pasal 148 ayat 1).";
  const note = text(body.note, 300);
  if (note.bad || !note.value || note.value.length < 10) fe.note = "Jelaskan keadaannya (paling sedikit 10 karakter).";
  else if (note.tooLong) fe.note = "Penjelasan maksimal 300 karakter.";
  if (Object.keys(fe).length) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return { ok: true, value: { reason: reason!, note: note.value! } };
}
