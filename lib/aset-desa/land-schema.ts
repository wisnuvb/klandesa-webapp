import { cleanText as text, future, isRecord, parseIsoDate, type Parsed } from "@/lib/form-input";
import { toCents } from "@/lib/coop/loan-math";
import {
  AGREEMENT_KINDS,
  LIMITS,
  MAX_AREA,
  REGISTERED_RIGHTS,
  isAgreementKind,
  isDocKind,
  isLeaseAccount,
  isLesseeKind,
  isPeriodUnit,
  isRightKind,
  isUsage,
  type AgreementKind,
  type DocKind,
  type LesseeKind,
  type PeriodUnit,
  type RightKind,
  type Usage,
} from "./land-catalog";
import { buildChargePlan, maxEnd } from "./land-calc";

const blank = (v: unknown) => v === undefined || v === null || v === "";
const has = (b: Record<string, unknown>, k: string) => Object.prototype.hasOwnProperty.call(b, k);
const bad = (fe: Record<string, string>) => ({ ok: false as const, errors: Object.values(fe), fieldErrors: fe });
const notRecord = () => ({ ok: false as const, errors: ["Data tidak valid."], fieldErrors: {} });
const MAX_CENTS = 99_999_999_999_999n;

/** Tanggal wajar (2000-2100): menolak "0001-01-01" dan sejenisnya. */
const sane = (d: Date | null): Date | null => (d && d.getUTCFullYear() >= 2000 && d.getUTCFullYear() <= 2100 ? d : null);

function optText(b: Record<string, unknown>, k: string, max: number, label: string, fe: Record<string, string>): string | null {
  const t = text(b[k], max);
  if (t.bad || t.tooLong) fe[k] = `${label} maksimal ${max} karakter.`;
  return t.value;
}

/** Luas m2 sebagai string desimal untuk Prisma (hindari float). Menerima angka atau teks "1250.5". */
export function parseArea(raw: unknown): string | null {
  const n = typeof raw === "number" ? raw : typeof raw === "string" && /^\d{1,11}([.,]\d{1,2})?$/.test(raw.trim()) ? Number(raw.trim().replace(",", ".")) : NaN;
  if (!Number.isFinite(n) || n <= 0 || n > MAX_AREA) return null;
  return n.toFixed(2);
}

export interface ParcelInput {
  areaSqm: string;
  address: string | null;
  boundaryNorth: string | null;
  boundaryEast: string | null;
  boundarySouth: string | null;
  boundaryWest: string | null;
  rightKind: RightKind;
  rightNumber: string | null;
  rightHolder: string | null;
  rightIssuedOn: Date | null;
  persilNo: string | null;
  letterCNo: string | null;
  usage: Usage;
  usageNote: string | null;
  notes: string | null;
}

export function parseParcelInput(body: unknown, now: Date = new Date()): Parsed<ParcelInput> {
  if (!isRecord(body)) return notRecord();
  const fe: Record<string, string> = {};
  const area = parseArea(body.areaSqm);
  if (!area) fe.areaSqm = "Isi luas dalam meter persegi (lebih dari nol, maksimal 2 angka desimal).";
  const rightKind = isRightKind(body.rightKind) ? body.rightKind : null;
  if (!rightKind) fe.rightKind = "Pilih jenis bukti hak.";
  const usage = blank(body.usage) ? "TIDAK_DIMANFAATKAN" : body.usage;
  if (!isUsage(usage)) fe.usage = "Pilih status pemanfaatan.";
  const rightNumber = optText(body, "rightNumber", 80, "Nomor bukti hak", fe);
  if (rightKind && (REGISTERED_RIGHTS as readonly string[]).includes(rightKind) && !rightNumber) fe.rightNumber = "Isi nomor sertipikat.";
  let rightIssuedOn: Date | null = null;
  if (!blank(body.rightIssuedOn)) {
    rightIssuedOn = sane(parseIsoDate(body.rightIssuedOn));
    if (!rightIssuedOn) fe.rightIssuedOn = "Tanggal tidak valid.";
    else if (future(rightIssuedOn, now)) fe.rightIssuedOn = "Tanggal tidak boleh di masa depan.";
  }
  const value = {
    areaSqm: area ?? "",
    address: optText(body, "address", 255, "Letak/alamat", fe),
    boundaryNorth: optText(body, "boundaryNorth", 200, "Batas utara", fe),
    boundaryEast: optText(body, "boundaryEast", 200, "Batas timur", fe),
    boundarySouth: optText(body, "boundarySouth", 200, "Batas selatan", fe),
    boundaryWest: optText(body, "boundaryWest", 200, "Batas barat", fe),
    rightKind: rightKind as RightKind,
    rightNumber,
    rightHolder: optText(body, "rightHolder", 150, "Atas nama", fe),
    rightIssuedOn,
    persilNo: optText(body, "persilNo", 40, "Nomor persil", fe),
    letterCNo: optText(body, "letterCNo", 40, "Nomor Letter C", fe),
    usage: usage as Usage,
    usageNote: optText(body, "usageNote", 300, "Keterangan pemanfaatan", fe),
    notes: optText(body, "notes", 500, "Catatan", fe),
  };
  if (Object.keys(fe).length) return bad(fe);
  return { ok: true, value };
}

export interface AgreementInput {
  kind: AgreementKind;
  lesseeName: string;
  lesseeKind: LesseeKind;
  lesseeAddress: string | null;
  lesseeContact: string | null;
  purpose: string | null;
  objectNote: string | null;
  leasedAreaSqm: string | null;
  startOn: Date;
  endOn: Date;
  periodUnit: PeriodUnit;
  amountCents: bigint;
  accountCode: string | null;
  agreementNo: string | null;
  signedOn: Date | null;
  tenantDuties: string;
  forceMajeureIncluded: boolean;
  otherTerms: string | null;
  perdesNo: string | null;
  perdesDate: Date | null;
  regencyPermitNo: string | null;
  regencyPermitDate: Date | null;
  appraisalRef: string | null;
}

function optDate(b: Record<string, unknown>, k: string, label: string, fe: Record<string, string>): Date | null {
  if (blank(b[k])) return null;
  const d = sane(parseIsoDate(b[k]));
  if (!d) fe[k] = `${label} tidak valid.`;
  return d;
}

/** Isian perjanjian (draf). Nomor, tanggal tanda tangan, Perdes, dan izin boleh kosong saat draf; wajib terisi saat diberlakukan. */
export function parseAgreementInput(body: unknown): Parsed<AgreementInput> {
  if (!isRecord(body)) return notRecord();
  const fe: Record<string, string> = {};
  const kind = isAgreementKind(body.kind) ? body.kind : null;
  if (!kind) fe.kind = "Pilih jenis pemanfaatan.";
  const lessee = text(body.lesseeName, 150);
  if (lessee.bad || !lessee.value) fe.lesseeName = "Isi nama pihak yang memanfaatkan.";
  else if (lessee.tooLong) fe.lesseeName = "Nama maksimal 150 karakter.";
  const lesseeKind = isLesseeKind(body.lesseeKind) ? body.lesseeKind : null;
  if (!lesseeKind) fe.lesseeKind = "Pilih perorangan atau badan.";
  const unit = isPeriodUnit(body.periodUnit) ? body.periodUnit : null;
  if (!unit) fe.periodUnit = "Pilih periode pembayaran.";

  const startOn = sane(parseIsoDate(body.startOn));
  if (!startOn) fe.startOn = "Isi tanggal mulai yang valid.";
  const endOn = sane(parseIsoDate(body.endOn));
  if (!endOn) fe.endOn = "Isi tanggal berakhir yang valid.";
  if (startOn && endOn && !fe.startOn && !fe.endOn) {
    if (endOn.getTime() <= startOn.getTime()) fe.endOn = "Tanggal berakhir harus setelah tanggal mulai.";
    else if (kind && endOn.getTime() > maxEnd(startOn, kind).getTime()) {
      fe.endOn = `Jangka waktu ${AGREEMENT_KINDS[kind].label.toLowerCase()} paling lama ${AGREEMENT_KINDS[kind].maxYears} tahun (${AGREEMENT_KINDS[kind].basis}). Untuk memperpanjang, buat perjanjian baru.`;
    }
  }

  const rawAmount = body.amount;
  const cents = typeof rawAmount === "string" || typeof rawAmount === "number" ? toCents(rawAmount) : null;
  if (cents === null || cents <= 0n || cents > MAX_CENTS) fe.amount = "Isi besaran sewa/kontribusi dalam rupiah, lebih dari nol.";

  if (startOn && endOn && unit && !fe.startOn && !fe.endOn && cents !== null && cents > 0n && cents <= MAX_CENTS) {
    const plan = buildChargePlan(startOn, endOn, unit, cents);
    if (!plan) fe.endOn = unit === "TAHUN" ? "Jangka waktu harus kelipatan tahun utuh agar tagihan tahunan dapat dijadwalkan." : "Jangka waktu harus kelipatan bulan utuh agar tagihan bulanan dapat dijadwalkan.";
    else if (plan.length > LIMITS.chargesPerAgreement) fe.endOn = `Jadwal tagihan maksimal ${LIMITS.chargesPerAgreement} periode.`;
  }

  let leasedArea: string | null = null;
  if (!blank(body.leasedAreaSqm)) {
    leasedArea = parseArea(body.leasedAreaSqm);
    if (!leasedArea) fe.leasedAreaSqm = "Luas yang dimanfaatkan harus angka lebih dari nol (m2).";
  }

  let accountCode: string | null = null;
  if (!blank(body.accountCode)) {
    if (!isLeaseAccount(body.accountCode)) fe.accountCode = "Pilih rekening Hasil Aset (4.1.2.x) dari daftar.";
    else accountCode = body.accountCode;
  }

  const signedOn = optDate(body, "signedOn", "Tanggal penandatanganan", fe);
  const perdesDate = optDate(body, "perdesDate", "Tanggal Peraturan Desa", fe);
  const regencyPermitDate = optDate(body, "regencyPermitDate", "Tanggal izin", fe);
  const duties = text(body.tenantDuties, 500);
  if (duties.bad || duties.tooLong) fe.tenantDuties = "Tanggung jawab maksimal 500 karakter.";
  if (body.forceMajeureIncluded !== undefined && typeof body.forceMajeureIncluded !== "boolean") fe.forceMajeureIncluded = "Pilihan tidak valid.";

  const value = {
    kind: kind as AgreementKind,
    lesseeName: lessee.value ?? "",
    lesseeKind: lesseeKind as LesseeKind,
    lesseeAddress: optText(body, "lesseeAddress", 255, "Alamat", fe),
    lesseeContact: optText(body, "lesseeContact", 40, "Kontak", fe),
    purpose: optText(body, "purpose", 200, "Peruntukan", fe),
    objectNote: optText(body, "objectNote", 300, "Uraian objek", fe),
    leasedAreaSqm: leasedArea,
    startOn: startOn as Date,
    endOn: endOn as Date,
    periodUnit: unit as PeriodUnit,
    amountCents: cents as bigint,
    accountCode,
    agreementNo: optText(body, "agreementNo", 100, "Nomor perjanjian", fe),
    signedOn,
    tenantDuties: duties.value ?? "",
    forceMajeureIncluded: body.forceMajeureIncluded === true,
    otherTerms: optText(body, "otherTerms", 1000, "Ketentuan lain", fe),
    perdesNo: optText(body, "perdesNo", 100, "Nomor Peraturan Desa", fe),
    perdesDate,
    regencyPermitNo: optText(body, "regencyPermitNo", 100, "Nomor izin", fe),
    regencyPermitDate,
    appraisalRef: optText(body, "appraisalRef", 150, "Rujukan penilaian", fe),
  };
  if (!fe.perdesNo && !fe.perdesDate && (value.perdesNo === null) !== (value.perdesDate === null)) fe.perdesNo = "Nomor dan tanggal Peraturan Desa diisi bersamaan.";
  if (!fe.regencyPermitNo && !fe.regencyPermitDate && (value.regencyPermitNo === null) !== (value.regencyPermitDate === null)) fe.regencyPermitNo = "Nomor dan tanggal izin diisi bersamaan.";
  if (Object.keys(fe).length) return bad(fe);
  return { ok: true, value };
}


/** Perubahan terbatas pada perjanjian yang sudah berlaku: kontak, ketentuan tambahan, rujukan penilaian, dan izin yang menyusul. */
export interface AmendInput {
  lesseeAddress: string | null;
  lesseeContact: string | null;
  otherTerms: string | null;
  appraisalRef: string | null;
  regencyPermitNo: string | null;
  regencyPermitDate: Date | null;
}
export function parseAmendInput(body: unknown): Parsed<AmendInput> {
  if (!isRecord(body)) return notRecord();
  const fe: Record<string, string> = {};
  const value: AmendInput = {
    lesseeAddress: optText(body, "lesseeAddress", 255, "Alamat", fe),
    lesseeContact: optText(body, "lesseeContact", 40, "Kontak", fe),
    otherTerms: optText(body, "otherTerms", 1000, "Ketentuan lain", fe),
    appraisalRef: optText(body, "appraisalRef", 150, "Rujukan penilaian", fe),
    regencyPermitNo: optText(body, "regencyPermitNo", 100, "Nomor izin", fe),
    regencyPermitDate: optDate(body, "regencyPermitDate", "Tanggal izin", fe),
  };
  if (!fe.regencyPermitNo && !fe.regencyPermitDate && (value.regencyPermitNo === null) !== (value.regencyPermitDate === null)) fe.regencyPermitNo = "Nomor dan tanggal izin diisi bersamaan.";
  if (has(body, "agreementNo") || has(body, "amount") || has(body, "startOn") || has(body, "endOn") || has(body, "lesseeName")) fe.general = "Perjanjian yang sudah berlaku tidak dapat diubah pokoknya. Batalkan lalu buat perjanjian baru.";
  if (Object.keys(fe).length) return bad(fe);
  return { ok: true, value };
}

export interface ReceiveInput {
  receivedOn: Date;
  channel: "TUNAI" | "BANK";
  voucherNo: string | null;
}
export function parseReceiveInput(body: unknown, now: Date = new Date()): Parsed<ReceiveInput> {
  if (!isRecord(body)) return notRecord();
  const fe: Record<string, string> = {};
  const receivedOn = sane(parseIsoDate(body.receivedOn));
  if (!receivedOn) fe.receivedOn = "Isi tanggal diterima yang valid.";
  else if (future(receivedOn, now)) fe.receivedOn = "Tanggal diterima tidak boleh di masa depan.";
  const channel = body.channel === "TUNAI" || body.channel === "BANK" ? body.channel : null;
  if (!channel) fe.channel = "Pilih kas tunai atau rekening bank desa.";
  const voucherNo = optText(body, "voucherNo", 60, "Nomor bukti", fe);
  if (Object.keys(fe).length) return bad(fe);
  return { ok: true, value: { receivedOn: receivedOn as Date, channel: channel as "TUNAI" | "BANK", voucherNo } };
}

export interface DocInput {
  kind: DocKind;
  archiveId: bigint;
  label: string | null;
}
export function parseDocInput(body: unknown): Parsed<DocInput> {
  if (!isRecord(body)) return notRecord();
  const fe: Record<string, string> = {};
  const kind = isDocKind(body.kind) ? body.kind : null;
  if (!kind) fe.kind = "Pilih jenis dokumen.";
  const raw = typeof body.archiveId === "number" ? String(body.archiveId) : body.archiveId;
  const id = typeof raw === "string" && /^\d{1,15}$/.test(raw.trim()) && BigInt(raw.trim()) > 0n ? BigInt(raw.trim()) : null;
  if (id === null) fe.archiveId = "Pilih dokumen dari Arsip Digital.";
  const label = optText(body, "label", 150, "Keterangan", fe);
  if (Object.keys(fe).length) return bad(fe);
  return { ok: true, value: { kind: kind as DocKind, archiveId: id as bigint, label } };
}
