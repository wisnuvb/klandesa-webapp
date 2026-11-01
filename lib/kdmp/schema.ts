import { cleanText as text, isRecord, parseIsoDate, type Parsed } from "@/lib/form-input";
import { toCents } from "@/lib/coop/loan-math";
import { isKind, type Kind } from "./catalog";

const has = (b: Record<string, unknown>, k: string) => Object.prototype.hasOwnProperty.call(b, k);
const blank = (v: unknown) => v === undefined || v === null || v === "";
const MAX_CENTS = 99_999_999_999_999n;
function money(v: unknown): { value: bigint | null; bad: boolean } {
  if (blank(v)) return { value: null, bad: false };
  const c = typeof v === "string" || typeof v === "number" ? toCents(v) : null;
  return c === null || c > MAX_CENTS ? { value: null, bad: true } : { value: c, bad: false };
}
/** Bilangan bulat dari angka atau string digit saja (tanpa "1e3", "0x10", array, atau boolean). */
const digits = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && /^\d{1,10}$/.test(v.trim()) ? Number(v) : NaN;
  return Number.isInteger(n) ? n : null;
};
const posInt = (v: unknown): number | null => {
  const n = digits(v);
  return n !== null && n >= 1 && n <= 2_000_000_000 ? n : null;
};
/** Tanggal wajar (tahun 2000-2100): menolak "0001-01-01" dan sejenisnya. */
const sane = (d: Date | null): Date | null => (d && d.getUTCFullYear() >= 2000 && d.getUTCFullYear() <= 2100 ? d : null);
const bad = (fe: Record<string, string>) => ({ ok: false as const, errors: Object.values(fe), fieldErrors: fe });
const notRecord = () => ({ ok: false as const, errors: ["Data tidak valid."], fieldErrors: {} });

function year(body: Record<string, unknown>, fe: Record<string, string>): number {
  const y = digits(body.year) ?? NaN;
  if (!Number.isInteger(y) || y < 2000 || y > 2100) fe.year = "Isi tahun antara 2000 dan 2100.";
  return y;
}
function optText(body: Record<string, unknown>, k: string, max: number, label: string, fe: Record<string, string>): string | null {
  const t = text(body[k], max);
  if (t.bad || t.tooLong) fe[k] = `${label} maksimal ${max} karakter.`;
  return t.value;
}

export interface DisbursementInput {
  year: number;
  receivedOn: Date;
  amountCents: bigint;
  reference: string | null;
  note: string | null;
}
export function parseDisbursement(body: unknown): Parsed<DisbursementInput> {
  if (!isRecord(body)) return notRecord();
  const fe: Record<string, string> = {};
  const y = year(body, fe);
  const receivedOn = sane(parseIsoDate(body.receivedOn));
  if (!receivedOn) fe.receivedOn = "Isi tanggal penerimaan yang valid.";
  else if (Number.isInteger(y) && Math.abs(receivedOn.getUTCFullYear() - y) > 1) fe.receivedOn = `Tanggal penerimaan harus sekitar tahun anggaran ${y}.`;
  const amount = money(body.amount);
  if (amount.bad || amount.value === null || amount.value <= 0n) fe.amount = "Jumlah penyaluran harus angka rupiah lebih dari nol.";
  const reference = optText(body, "reference", 150, "Nomor keputusan/bukti", fe);
  const note = optText(body, "note", 300, "Catatan", fe);
  if (Object.keys(fe).length) return bad(fe);
  return { ok: true, value: { year: y, receivedOn: receivedOn!, amountCents: amount.value!, reference, note } };
}

export interface InstallmentInput {
  year: number;
  facilityId: number | null;
  paidOn: Date;
  amountCents: bigint;
  payee: string;
  reference: string | null;
  note: string | null;
}
export function parseInstallment(body: unknown): Parsed<InstallmentInput> {
  if (!isRecord(body)) return notRecord();
  const fe: Record<string, string> = {};
  const y = year(body, fe);
  const facilityId = blank(body.facilityId) ? null : posInt(body.facilityId);
  if (!blank(body.facilityId) && !facilityId) fe.facilityId = "Pilihan gerai/gudang tidak valid.";
  const paidOn = sane(parseIsoDate(body.paidOn));
  if (!paidOn) fe.paidOn = "Isi tanggal pembayaran yang valid.";
  else if (Number.isInteger(y) && Math.abs(paidOn.getUTCFullYear() - y) > 1) fe.paidOn = `Tanggal pembayaran harus sekitar tahun anggaran ${y}.`;
  const amount = money(body.amount);
  if (amount.bad || amount.value === null || amount.value <= 0n) fe.amount = "Jumlah angsuran harus angka rupiah lebih dari nol.";
  const payee = text(body.payee, 150);
  if (payee.bad || payee.tooLong || !payee.value) fe.payee = "Penerima pembayaran wajib diisi (maks. 150 karakter).";
  const reference = optText(body, "reference", 150, "Nomor perjanjian/kuitansi", fe);
  const note = optText(body, "note", 300, "Catatan", fe);
  if (Object.keys(fe).length) return bad(fe);
  return { ok: true, value: { year: y, facilityId, paidOn: paidOn!, amountCents: amount.value!, payee: payee.value!, reference, note } };
}

export interface FacilityCreate {
  year: number;
  kind: Kind;
  name: string;
  location: string | null;
  contractCents: bigint | null;
  note: string | null;
}
export function parseFacilityCreate(body: unknown): Parsed<FacilityCreate> {
  if (!isRecord(body)) return notRecord();
  const fe: Record<string, string> = {};
  const y = year(body, fe);
  if (!isKind(body.kind)) fe.kind = "Pilih jenis.";
  const name = text(body.name, 200);
  if (name.bad || name.tooLong || !name.value) fe.name = "Nama wajib diisi (maks. 200 karakter).";
  const location = optText(body, "location", 200, "Lokasi", fe);
  const contract = money(body.contract);
  if (contract.bad || (contract.value !== null && contract.value <= 0n)) fe.contract = "Nilai pekerjaan harus angka rupiah lebih dari nol.";
  const note = optText(body, "note", 300, "Catatan", fe);
  if (Object.keys(fe).length) return bad(fe);
  return { ok: true, value: { year: y, kind: body.kind as Kind, name: name.value!, location, contractCents: contract.value, note } };
}

export interface FacilityPatch {
  kind?: Kind;
  name?: string;
  location?: string | null;
  contractCents?: bigint | null;
  operatingOn?: Date | null;
  note?: string | null;
}
export function parseFacilityPatch(body: unknown): Parsed<FacilityPatch> {
  if (!isRecord(body)) return notRecord();
  const fe: Record<string, string> = {};
  const out: FacilityPatch = {};
  if (has(body, "kind")) {
    if (isKind(body.kind)) out.kind = body.kind;
    else fe.kind = "Pilih jenis.";
  }
  if (has(body, "name")) {
    const t = text(body.name, 200);
    if (t.bad || t.tooLong || !t.value) fe.name = "Nama wajib diisi (maks. 200 karakter).";
    else out.name = t.value;
  }
  if (has(body, "location")) out.location = optText(body, "location", 200, "Lokasi", fe);
  if (has(body, "note")) out.note = optText(body, "note", 300, "Catatan", fe);
  if (has(body, "contract")) {
    const m = money(body.contract);
    if (m.bad || (m.value !== null && m.value <= 0n)) fe.contract = "Nilai pekerjaan harus angka rupiah lebih dari nol.";
    else out.contractCents = m.value;
  }
  if (has(body, "operatingOn")) {
    if (blank(body.operatingOn)) out.operatingOn = null;
    else {
      const d = sane(parseIsoDate(body.operatingOn));
      if (!d) fe.operatingOn = "Tanggal tidak valid.";
      else out.operatingOn = d;
    }
  }
  if (Object.keys(fe).length) return bad(fe);
  return { ok: true, value: out };
}

export interface ProgressInput {
  recordedOn: Date;
  progressPct: number;
  note: string | null;
}
export function parseProgress(body: unknown): Parsed<ProgressInput> {
  if (!isRecord(body)) return notRecord();
  const fe: Record<string, string> = {};
  const recordedOn = sane(parseIsoDate(body.recordedOn));
  if (!recordedOn) fe.recordedOn = "Isi tanggal pencatatan yang valid.";
  const pct = typeof body.progressPct === "string" && /^\d{1,3}$/.test(body.progressPct.trim()) ? Number(body.progressPct) : body.progressPct;
  if (typeof pct !== "number" || !Number.isInteger(pct) || pct < 0 || pct > 100) fe.progressPct = "Progres harus bilangan bulat 0 sampai 100.";
  const note = optText(body, "note", 300, "Catatan", fe);
  if (Object.keys(fe).length) return bad(fe);
  return { ok: true, value: { recordedOn: recordedOn!, progressPct: pct as number, note } };
}
