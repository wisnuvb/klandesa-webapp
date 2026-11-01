import { cleanText as text, isRecord, parseIsoDate, type Parsed } from "@/lib/form-input";
import { toCents } from "@/lib/coop/loan-math";
import { CRITERION_NOS, isMethod, isSource, type CriterionNo, type Method, type Source } from "./catalog";

const has = (b: Record<string, unknown>, k: string) => Object.prototype.hasOwnProperty.call(b, k);
const blank = (v: unknown) => v === undefined || v === null || v === "";
const posInt = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 2_000_000_000 ? n : null;
};

export interface ProgramCreate {
  year: number;
  title: string;
  monthlyCents: bigint;
  totalMonths: number;
}
export function parseProgramCreate(body: unknown): Parsed<ProgramCreate> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };
  const year = Number(body.year);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) fe.year = "Isi tahun antara 2000 dan 2100.";
  const title = text(body.title, 200);
  if (title.bad || title.tooLong || !title.value) fe.title = "Judul wajib diisi (maks. 200 karakter).";
  const monthly = typeof body.monthly === "string" || typeof body.monthly === "number" ? toCents(body.monthly) : null;
  if (monthly === null || monthly <= 0n) fe.monthly = "Nilai per bulan harus angka rupiah lebih dari nol.";
  const totalMonths = Number(body.totalMonths);
  if (!Number.isInteger(totalMonths) || totalMonths < 1 || totalMonths > 12) fe.totalMonths = "Jumlah bulan antara 1 dan 12.";
  if (Object.keys(fe).length) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return { ok: true, value: { year, title: title.value!, monthlyCents: monthly!, totalMonths } };
}

export interface ProgramPatch {
  title?: string;
  monthlyCents?: bigint;
  totalMonths?: number;
  musdesMeetingId?: number | null;
  decreeNumber?: string | null;
  decreeDate?: Date | null;
  reportedToRegencyOn?: Date | null;
  note?: string | null;
}
export function parseProgramPatch(body: unknown): Parsed<ProgramPatch> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };
  const out: ProgramPatch = {};
  if (has(body, "title")) {
    const t = text(body.title, 200);
    if (t.bad || t.tooLong || !t.value) fe.title = "Judul wajib diisi (maks. 200 karakter).";
    else out.title = t.value;
  }
  if (has(body, "monthly")) {
    const m = typeof body.monthly === "string" || typeof body.monthly === "number" ? toCents(body.monthly) : null;
    if (m === null || m <= 0n) fe.monthly = "Nilai per bulan harus angka rupiah lebih dari nol.";
    else out.monthlyCents = m;
  }
  if (has(body, "totalMonths")) {
    const n = Number(body.totalMonths);
    if (!Number.isInteger(n) || n < 1 || n > 12) fe.totalMonths = "Jumlah bulan antara 1 dan 12.";
    else out.totalMonths = n;
  }
  if (has(body, "musdesMeetingId")) {
    if (blank(body.musdesMeetingId)) out.musdesMeetingId = null;
    else if (posInt(body.musdesMeetingId)) out.musdesMeetingId = posInt(body.musdesMeetingId);
    else fe.musdesMeetingId = "Musyawarah tidak valid.";
  }
  if (has(body, "decreeNumber")) {
    const t = text(body.decreeNumber, 100);
    if (t.bad || t.tooLong) fe.decreeNumber = "Nomor keputusan maksimal 100 karakter.";
    else out.decreeNumber = t.value;
  }
  for (const k of ["decreeDate", "reportedToRegencyOn"] as const) {
    if (has(body, k)) {
      if (blank(body[k])) out[k] = null;
      else {
        const d = parseIsoDate(body[k]);
        if (!d) fe[k] = "Tanggal tidak valid.";
        else out[k] = d;
      }
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

export interface BeneficiaryInput {
  residentId: number;
  source: Source;
  criteria: CriterionNo[];
  category: string;
}
export function parseBeneficiary(body: unknown): Parsed<BeneficiaryInput> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };
  const residentId = posInt(body.residentId);
  if (!residentId) fe.residentId = "Pilih warga.";
  const source = isSource(body.source) ? body.source : null;
  if (!source) fe.source = "Pilih sumber data penerima.";
  const criteria = Array.isArray(body.criteria) ? [...new Set(body.criteria.map(Number))].filter((n): n is CriterionNo => (CRITERION_NOS as readonly number[]).includes(n)).sort() : [];
  if (source === "DESA" && !criteria.length) fe.criteria = "Pilih paling sedikit satu kriteria bila memakai kriteria Desa.";
  const cat = text(body.category ?? "Miskin ekstrem", 100);
  if (cat.bad || cat.tooLong || !cat.value) fe.category = "Kategori wajib diisi (maks. 100 karakter).";
  if (Object.keys(fe).length) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return { ok: true, value: { residentId: residentId!, source: source!, criteria: source === "DESA" ? criteria : [], category: cat.value! } };
}

export interface ReplaceInput {
  meetingId: number;
  reason: string;
  decreeRef: string | null;
  replacement: BeneficiaryInput | null;
}
export function parseReplace(body: unknown): Parsed<ReplaceInput> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };
  const meetingId = posInt(body.meetingId);
  if (!meetingId) fe.meetingId = "Pilih Musyawarah Desa khusus yang menetapkan perubahan.";
  const reason = text(body.reason, 300);
  if (reason.bad || reason.tooLong || !reason.value || reason.value.length < 5) fe.reason = "Alasan wajib diisi (minimal 5 karakter, maks. 300).";
  const dr = text(body.decreeRef, 150);
  if (dr.bad || dr.tooLong) fe.decreeRef = "Nomor keputusan maksimal 150 karakter.";
  let replacement: BeneficiaryInput | null = null;
  if (isRecord(body.replacement)) {
    const p = parseBeneficiary(body.replacement);
    if (!p.ok) for (const [k, v] of Object.entries(p.fieldErrors)) fe[`replacement.${k}`] = v;
    else replacement = p.value;
  }
  if (Object.keys(fe).length) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return { ok: true, value: { meetingId: meetingId!, reason: reason.value!, decreeRef: dr.value, replacement } };
}

export interface PaymentInput {
  beneficiaryId: number;
  monthFrom: number;
  monthTo: number;
  method: Method;
  paidOn: Date;
  receivedBy: string | null;
  note: string | null;
}
export function parsePayment(body: unknown): Parsed<PaymentInput> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };
  const beneficiaryId = posInt(body.beneficiaryId);
  if (!beneficiaryId) fe.beneficiaryId = "Pilih penerima.";
  const monthFrom = Number(body.monthFrom);
  const monthTo = body.monthTo === undefined || body.monthTo === "" ? monthFrom : Number(body.monthTo);
  if (!Number.isInteger(monthFrom) || monthFrom < 1 || monthFrom > 12) fe.monthFrom = "Isi bulan mulai (1 sampai 12).";
  if (!Number.isInteger(monthTo) || monthTo < monthFrom || monthTo > 12) fe.monthTo = "Bulan akhir tidak boleh sebelum bulan mulai.";
  const method = isMethod(body.method) ? body.method : null;
  if (!method) fe.method = "Pilih cara pembayaran.";
  const paidOn = parseIsoDate(body.paidOn);
  if (!paidOn) fe.paidOn = "Isi tanggal pembayaran yang valid.";
  const rb = text(body.receivedBy, 150);
  if (rb.bad || rb.tooLong) fe.receivedBy = "Nama penerima maksimal 150 karakter.";
  const note = text(body.note, 300);
  if (note.bad || note.tooLong) fe.note = "Catatan maksimal 300 karakter.";
  if (Object.keys(fe).length) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return { ok: true, value: { beneficiaryId: beneficiaryId!, monthFrom, monthTo, method: method!, paidOn: paidOn!, receivedBy: rb.value, note: note.value } };
}
