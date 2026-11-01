import { cleanText as text, isRecord, parseIsoDate, type Parsed } from "@/lib/form-input";
import { toCents } from "@/lib/coop/loan-math";
import { isKegiatanCode } from "@/lib/apbdes/catalog";
import { isFocusKey, isProhibitionKey, isPublicationChannel, type FocusKey, type ProhibitionKey, type PublicationChannel } from "./rules";

const has = (b: Record<string, unknown>, k: string) => Object.prototype.hasOwnProperty.call(b, k);
const blank = (v: unknown) => v === undefined || v === null || v === "";
const MAX_CENTS = 99_999_999_999_999n;

function money(v: unknown): { value: bigint | null; bad: boolean } {
  if (blank(v)) return { value: null, bad: false };
  const c = toCents(typeof v === "number" ? v : typeof v === "string" ? v : "x");
  return c === null || c > MAX_CENTS ? { value: null, bad: true } : { value: c, bad: false };
}
function day(v: unknown): { value: Date | null; bad: boolean } {
  if (blank(v)) return { value: null, bad: false };
  const d = parseIsoDate(v);
  return d ? { value: d, bad: false } : { value: null, bad: true };
}

export interface YearSettingPatch {
  regularCents?: bigint | null;
  kdmpCents?: bigint | null;
  isMandiri?: boolean;
  focusReportedOn?: Date | null;
  prevYearReportedOn?: Date | null;
  stage1ReportedOn?: Date | null;
  note?: string | null;
}

/** Hanya kolom yang dikirim yang diubah (PATCH sebagian). */
export function parseYearSetting(body: unknown): Parsed<YearSettingPatch> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };
  const out: YearSettingPatch = {};
  for (const [k, label] of [["regularCents", "Pagu reguler"], ["kdmpCents", "Pagu KDMP"]] as const) {
    const src = k === "regularCents" ? "regular" : "kdmp";
    if (has(body, src)) {
      const m = money(body[src]);
      if (m.bad) fe[src] = `${label} harus berupa angka rupiah yang wajar.`;
      else out[k] = m.value;
    }
  }
  if (has(body, "isMandiri")) {
    if (typeof body.isMandiri !== "boolean") fe.isMandiri = "Pilihan tidak valid.";
    else out.isMandiri = body.isMandiri;
  }
  for (const [k, label] of [["focusReportedOn", "Tanggal laporan penetapan fokus"], ["prevYearReportedOn", "Tanggal laporan tahun lalu"], ["stage1ReportedOn", "Tanggal laporan tahap I"]] as const) {
    if (has(body, k)) {
      const d = day(body[k]);
      if (d.bad) fe[k] = `${label} tidak valid.`;
      else out[k] = d.value;
    }
  }
  if (has(body, "note")) {
    const t = text(body.note, 500);
    if (t.bad || t.tooLong) fe.note = "Catatan maksimal 500 karakter.";
    else out.note = t.value;
  }
  if (Object.keys(fe).length) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return { ok: true, value: out };
}

export function parseTag(body: unknown): Parsed<{ activityCode: string; focus: FocusKey }> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };
  const activityCode = typeof body.activityCode === "string" ? body.activityCode.trim() : "";
  if (!isKegiatanCode(activityCode)) fe.activityCode = "Kegiatan tidak dikenal.";
  if (!isFocusKey(body.focus)) fe.focus = "Pilih fokus penggunaan.";
  if (Object.keys(fe).length) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return { ok: true, value: { activityCode, focus: body.focus as FocusKey } };
}

export function parseException(body: unknown): Parsed<{ ruleKey: ProhibitionKey; activityCode: string; accountCode: string; reason: string }> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };
  if (!isProhibitionKey(body.ruleKey)) fe.ruleKey = "Larangan tidak dikenal.";
  const activityCode = typeof body.activityCode === "string" ? body.activityCode.trim() : "";
  if (activityCode && !isKegiatanCode(activityCode)) fe.activityCode = "Kegiatan tidak dikenal.";
  const accountCode = typeof body.accountCode === "string" ? body.accountCode.trim() : "";
  if (!/^[4-6](\.\d+){0,3}$/.test(accountCode)) fe.accountCode = "Kode rekening tidak valid.";
  const reason = text(body.reason, 500);
  if (reason.bad || reason.tooLong || !reason.value || reason.value.length < 15) fe.reason = "Alasan pengecualian wajib diisi, minimal 15 karakter (maks. 500).";
  if (Object.keys(fe).length) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return { ok: true, value: { ruleKey: body.ruleKey as ProhibitionKey, activityCode, accountCode, reason: reason.value! } };
}

export function parsePublication(body: unknown): Parsed<{ channel: PublicationChannel; publishedOn: Date; location: string | null; note: string | null }> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };
  if (!isPublicationChannel(body.channel)) fe.channel = "Pilih kanal publikasi.";
  const d = day(body.publishedOn);
  if (d.bad || !d.value) fe.publishedOn = "Isi tanggal publikasi yang valid.";
  const location = text(body.location, 300);
  if (location.bad || location.tooLong) fe.location = "Lokasi/tautan maksimal 300 karakter.";
  const note = text(body.note, 300);
  if (note.bad || note.tooLong) fe.note = "Catatan maksimal 300 karakter.";
  if (Object.keys(fe).length) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return { ok: true, value: { channel: body.channel as PublicationChannel, publishedOn: d.value!, location: location.value, note: note.value } };
}
