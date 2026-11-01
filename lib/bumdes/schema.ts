import { cleanText as text, future, isRecord, parseIsoDate, type Parsed } from "@/lib/form-input";
import { toCents } from "@/lib/coop/loan-math";
import { DEFAULT_CASH_ACCOUNT, DEFAULT_EXPENSE_ACCOUNT, DEFAULT_INCOME_ACCOUNT, FLOW_ONLY_ACCOUNTS, LIMITS, OPENING_ALLOWED_ACCOUNTS, isFlowKind, isLegalStatus, isOfficerRole, isRankingLevel, type FlowKind, type LegalStatus, type OfficerRole } from "./catalog";
import { MAX_CENTS, checkCashAccounts, checkLines, type JLine } from "./calc";

/** Penguraian dan validasi isian BUM Desa (murni). Koersi ketat: "1e3", "0x10", array, boolean, dan angka berformat aneh ditolak. */

const has = (b: Record<string, unknown>, k: string) => Object.prototype.hasOwnProperty.call(b, k);
const blank = (v: unknown) => v === undefined || v === null || v === "";
const digits = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && /^\d{1,10}$/.test(v.trim()) ? Number(v) : NaN;
  return Number.isInteger(n) ? n : null;
};
const posInt = (v: unknown): number | null => {
  const n = digits(v);
  return n !== null && n >= 1 && n <= 2_000_000_000 ? n : null;
};
const sane = (d: Date | null): Date | null => (d && d.getUTCFullYear() >= 2000 && d.getUTCFullYear() <= 2100 ? d : null);
const bad = (fe: Record<string, string>) => ({ ok: false as const, errors: Object.values(fe), fieldErrors: fe });
const notRecord = () => ({ ok: false as const, errors: ["Data tidak valid."], fieldErrors: {} });

const TOO_BIG = "Jumlah terlalu besar (maksimal Rp999.999.999.999,99).";
/** `big`: bentuknya angka rupiah yang sah tetapi melebihi batas (dibedakan dari angka berbentuk salah). */
function money(v: unknown): { value: bigint | null; bad: boolean; big: boolean } {
  if (blank(v)) return { value: null, bad: false, big: false };
  const c = typeof v === "string" || typeof v === "number" ? toCents(v) : null;
  if (c !== null) return c > MAX_CENTS ? { value: null, bad: true, big: true } : { value: c, bad: false, big: false };
  const s = typeof v === "string" ? v.trim() : typeof v === "number" && Number.isFinite(v) ? v.toFixed(2) : "";
  return { value: null, bad: true, big: /^\d{14,}(\.\d+)?$/.test(s) };
}
const moneyMsg = (m: { big: boolean }, fallback: string): string => (m.big ? TOO_BIG : fallback);
function optText(body: Record<string, unknown>, k: string, max: number, label: string, fe: Record<string, string>): string | null {
  const t = text(body[k], max);
  if (t.bad || t.tooLong) fe[k] = `${label} maksimal ${max} karakter.`;
  return t.value;
}
function reqText(body: Record<string, unknown>, k: string, max: number, label: string, fe: Record<string, string>): string | null {
  const t = text(body[k], max);
  if (t.bad || t.tooLong) fe[k] = `${label} maksimal ${max} karakter.`;
  else if (!t.value) fe[k] = `${label} wajib diisi.`;
  return t.value;
}
function optDate(body: Record<string, unknown>, k: string, label: string, fe: Record<string, string>): Date | null {
  if (blank(body[k])) return null;
  const d = sane(parseIsoDate(body[k]));
  if (!d) fe[k] = `${label} tidak valid.`;
  return d;
}

/** Alasan koreksi/pembatalan/pembukaan periode: wajib, 5-300 karakter. */
export function parseReason(body: unknown): Parsed<{ reason: string }> {
  if (!isRecord(body)) return notRecord();
  const t = text(body.reason, 300);
  const fe: Record<string, string> = {};
  if (t.bad || t.tooLong) fe.reason = "Alasan maksimal 300 karakter.";
  else if (!t.value || t.value.length < LIMITS.reasonMin) fe.reason = `Tulis alasan (minimal ${LIMITS.reasonMin} karakter).`;
  return Object.keys(fe).length ? bad(fe) : { ok: true, value: { reason: t.value! } };
}

// ---- Transaksi kas

export interface CashInput {
  unitId: number;
  entryDate: Date;
  direction: "income" | "expense";
  amountCents: bigint;
  category: string;
  description: string | null;
  accountCode: string;
  cashAccountCode: string;
}

/** Untuk pembuatan: semua isian dibaca. Untuk perubahan (`base`): isian yang tak dikirim mengikuti nilai lama. */
export function parseCash(body: unknown, now: Date, base?: Partial<Omit<CashInput, "entryDate"> & { entryDate: string }>): Parsed<CashInput> {
  if (!isRecord(body)) return notRecord();
  const fe: Record<string, string> = {};
  const pick = (k: string, fallback: unknown) => (has(body, k) ? body[k] : fallback);

  const unitId = posInt(pick("unitId", base?.unitId));
  if (unitId === null) fe.unitId = "Pilih unit usaha.";
  const entryDate = sane(parseIsoDate(pick("entryDate", base?.entryDate)));
  if (!entryDate) fe.entryDate = "Isi tanggal yang valid.";
  else if (future(entryDate, now)) fe.entryDate = "Tanggal tidak boleh di masa depan.";
  const dirRaw = pick("direction", base?.direction);
  const direction = dirRaw === "income" || dirRaw === "expense" ? dirRaw : null;
  if (!direction) fe.direction = "Pilih pemasukan atau pengeluaran.";
  const amountRaw = pick("amount", base?.amountCents !== undefined ? `${base.amountCents / 100n}.${String(base.amountCents % 100n).padStart(2, "0")}` : undefined);
  const amount = money(amountRaw);
  if (amount.bad || amount.value === null || amount.value <= 0n) fe.amount = moneyMsg(amount, "Jumlah harus angka rupiah lebih dari nol (maksimal 2 desimal).");
  const catSrc = has(body, "category") ? { category: body.category } : { category: base?.category };
  const category = reqText(catSrc, "category", 100, "Kategori", fe);
  const descSrc = has(body, "description") ? { description: body.description } : { description: base?.description };
  const description = optText(descSrc, "description", 5000, "Uraian", fe);

  const defCounter = direction === "expense" ? DEFAULT_EXPENSE_ACCOUNT : DEFAULT_INCOME_ACCOUNT;
  const accRaw = pick("accountCode", base?.accountCode);
  const accountCode = blank(accRaw) ? defCounter : typeof accRaw === "string" ? accRaw.trim() : "";
  const cashRaw = pick("cashAccountCode", base?.cashAccountCode);
  const cashAccountCode = blank(cashRaw) ? DEFAULT_CASH_ACCOUNT : typeof cashRaw === "string" ? cashRaw.trim() : "";
  const accErr = checkCashAccounts(cashAccountCode, accountCode);
  if (accErr) fe[/kas atau bank/.test(accErr) ? "cashAccountCode" : "accountCode"] = accErr;
  else if (FLOW_ONLY_ACCOUNTS.includes(accountCode)) fe.accountCode = "Akun penyertaan modal dan bagi hasil hanya dicatat lewat tab Dana Desa (dengan keputusan Musyawarah Desa dan Buku Kas Umum APB Desa).";

  if (Object.keys(fe).length || unitId === null || !entryDate || !direction || amount.value === null || !category) return bad(fe);
  return { ok: true, value: { unitId, entryDate, direction, amountCents: amount.value, category, description, accountCode, cashAccountCode } };
}

// ---- Jurnal manual

export interface JournalInput {
  /** null = Kantor Pusat */
  unitId: number | null;
  entryDate: Date;
  description: string;
  reference: string | null;
  /** Jurnal pembukaan (saldo awal): satu-satunya jurnal manual yang boleh memakai akun Penyertaan Modal Desa */
  opening: boolean;
  lines: JLine[];
}

export function parseJournal(body: unknown, now: Date): Parsed<JournalInput> {
  if (!isRecord(body)) return notRecord();
  const fe: Record<string, string> = {};
  let unitId: number | null = null;
  if (!blank(body.unitId) && body.unitId !== "PUSAT") {
    unitId = posInt(body.unitId);
    if (unitId === null) fe.unitId = "Pilih Kantor Pusat atau unit usaha.";
  }
  const entryDate = sane(parseIsoDate(body.entryDate));
  if (!entryDate) fe.entryDate = "Isi tanggal yang valid.";
  else if (future(entryDate, now)) fe.entryDate = "Tanggal tidak boleh di masa depan.";
  const description = reqText(body, "description", 300, "Uraian", fe);
  const reference = optText(body, "reference", 100, "Nomor bukti", fe);
  const lines: JLine[] = [];
  const raw = Array.isArray(body.lines) ? body.lines : null;
  if (!raw) fe.lines = "Isi baris jurnal.";
  else if (raw.length > LIMITS.linesPerJournal) fe.lines = `Jurnal paling banyak ${LIMITS.linesPerJournal} baris.`;
  else {
    raw.forEach((r, i) => {
      const n = i + 1;
      if (!isRecord(r)) return void (fe.lines = `Baris ${n}: tidak terbaca.`);
      const d = money(r.debit);
      const c = money(r.credit);
      const memo = text(r.memo, 200);
      if (d.big || c.big) fe.lines = `Baris ${n}: ${TOO_BIG}`;
      else if (d.bad || c.bad) fe.lines = `Baris ${n}: jumlah harus angka rupiah (maksimal 2 desimal).`;
      else if (memo.bad || memo.tooLong) fe.lines = `Baris ${n}: keterangan maksimal 200 karakter.`;
      else lines.push({ accountCode: typeof r.accountCode === "string" ? r.accountCode.trim() : "", debitCents: d.value ?? 0n, creditCents: c.value ?? 0n, memo: memo.value });
    });
    if (!fe.lines) {
      const errs = checkLines(lines);
      if (errs.length) fe.lines = errs[0]!;
    }
  }
  const opening = body.opening === true;
  if (!fe.lines) {
    const reserved = lines.find((l) => FLOW_ONLY_ACCOUNTS.includes(l.accountCode) && !(opening && OPENING_ALLOWED_ACCOUNTS.includes(l.accountCode)));
    if (reserved) fe.lines = `Akun ${reserved.accountCode} hanya dicatat lewat tab Dana Desa (keputusan Musyawarah Desa dan Buku Kas Umum APB Desa).${reserved.accountCode === "3.1.01.01" ? " Untuk modal Desa yang sudah ada sebelum pencatatan di aplikasi, centang jurnal pembukaan (saldo awal)." : ""}`;
    else if (opening && unitId !== null) fe.unitId = "Jurnal pembukaan dicatat pada Kantor Pusat.";
  }
  if (Object.keys(fe).length || !entryDate || !description) return bad(fe);
  return { ok: true, value: { unitId, entryDate, description, reference, opening, lines } };
}

// ---- Periode

export function parsePeriodAction(body: unknown): Parsed<{ year: number; half: 1 | 2; action: "tutup" | "buka"; reason: string | null }> {
  if (!isRecord(body)) return notRecord();
  const fe: Record<string, string> = {};
  const year = digits(body.year);
  if (year === null || year < 2000 || year > 2100) fe.year = "Isi tahun antara 2000 dan 2100.";
  const half = digits(body.half);
  if (half !== 1 && half !== 2) fe.half = "Pilih semester I atau II.";
  const action = body.action === "tutup" || body.action === "buka" ? body.action : null;
  if (!action) fe.action = "Tindakan tidak dikenal.";
  let reason: string | null = null;
  if (action === "buka") {
    const r = parseReason({ reason: body.reason });
    if (!r.ok) fe.reason = r.fieldErrors.reason ?? "Tulis alasan membuka kembali periode.";
    else reason = r.value.reason;
  }
  if (Object.keys(fe).length || year === null || (half !== 1 && half !== 2) || !action) return bad(fe);
  return { ok: true, value: { year, half, action, reason } };
}

// ---- Legalitas

export interface LegalInput {
  legalStatus: LegalStatus;
  establishMeetingId: number | null;
  establishedOn: Date | null;
  perdesNumber: string | null;
  perdesDate: Date | null;
  artNumber: string | null;
  artDate: Date | null;
  nameApprovalNo: string | null;
  nameApprovalDate: Date | null;
  certificateNo: string | null;
  certificateDate: Date | null;
  nib: string | null;
  npwp: string | null;
  businessFields: string | null;
  initialCapitalCents: bigint | null;
  rankingYear: number | null;
  rankingLevel: string | null;
  note: string | null;
}

/** NIB berisi 13 digit (format OSS). NPWP 15 atau 16 digit setelah titik/strip dibuang; format NPWP terbaru belum diverifikasi ke teks resmi. */
export function parseLegal(body: unknown): Parsed<LegalInput> {
  if (!isRecord(body)) return notRecord();
  const fe: Record<string, string> = {};
  const status = blank(body.legalStatus) ? "BELUM_DAFTAR" : body.legalStatus;
  if (!isLegalStatus(status)) fe.legalStatus = "Status badan hukum tidak dikenal.";
  let establishMeetingId: number | null = null;
  if (!blank(body.establishMeetingId)) {
    establishMeetingId = posInt(body.establishMeetingId);
    if (establishMeetingId === null) fe.establishMeetingId = "Musyawarah Desa tidak valid.";
  }
  const establishedOn = optDate(body, "establishedOn", "Tanggal pendirian", fe);
  const perdesNumber = optText(body, "perdesNumber", 100, "Nomor Peraturan Desa", fe);
  const perdesDate = optDate(body, "perdesDate", "Tanggal Peraturan Desa", fe);
  const artNumber = optText(body, "artNumber", 100, "Nomor Peraturan Kepala Desa (ART)", fe);
  const artDate = optDate(body, "artDate", "Tanggal Peraturan Kepala Desa (ART)", fe);
  const nameApprovalNo = optText(body, "nameApprovalNo", 100, "Nomor persetujuan nama", fe);
  const nameApprovalDate = optDate(body, "nameApprovalDate", "Tanggal persetujuan nama", fe);
  const certificateNo = optText(body, "certificateNo", 100, "Nomor sertifikat pendaftaran", fe);
  const certificateDate = optDate(body, "certificateDate", "Tanggal sertifikat pendaftaran", fe);
  const nibT = text(body.nib, 30);
  let nib: string | null = null;
  if (nibT.bad || nibT.tooLong) fe.nib = "NIB tidak valid.";
  else if (nibT.value) {
    const d = nibT.value.replace(/[\s.-]/g, "");
    if (!/^\d{13}$/.test(d)) fe.nib = "NIB terdiri atas 13 angka.";
    else nib = d;
  }
  const npwpT = text(body.npwp, 30);
  let npwp: string | null = null;
  if (npwpT.bad || npwpT.tooLong) fe.npwp = "NPWP tidak valid.";
  else if (npwpT.value) {
    const d = npwpT.value.replace(/[\s.-]/g, "");
    if (!/^\d{15,16}$/.test(d)) fe.npwp = "NPWP terdiri atas 15 atau 16 angka.";
    else npwp = d;
  }
  const businessFields = optText(body, "businessFields", 500, "Bidang usaha", fe);
  const cap = money(body.initialCapital);
  if (cap.bad || (cap.value !== null && cap.value < 0n)) fe.initialCapital = moneyMsg(cap, "Modal awal harus angka rupiah.");
  let rankingYear: number | null = null;
  if (!blank(body.rankingYear)) {
    rankingYear = digits(body.rankingYear);
    if (rankingYear === null || rankingYear < 2021 || rankingYear > 2100) fe.rankingYear = "Tahun pemeringkatan tidak valid.";
  }
  let rankingLevel: string | null = null;
  if (!blank(body.rankingLevel)) {
    if (isRankingLevel(body.rankingLevel)) rankingLevel = body.rankingLevel;
    else fe.rankingLevel = "Pilih level A sampai D.";
  }
  const note = optText(body, "note", 500, "Catatan", fe);
  if (status === "BADAN_HUKUM" && !fe.certificateNo && !certificateNo) fe.certificateNo = "Status berbadan hukum memerlukan nomor sertifikat pendaftaran.";
  if (Object.keys(fe).length) return bad(fe);
  return {
    ok: true,
    value: { legalStatus: status as LegalStatus, establishMeetingId, establishedOn, perdesNumber, perdesDate, artNumber, artDate, nameApprovalNo, nameApprovalDate, certificateNo, certificateDate, nib, npwp, businessFields, initialCapitalCents: cap.value, rankingYear, rankingLevel, note },
  };
}

// ---- Pengurus

export interface OfficerInput {
  role: OfficerRole;
  name: string;
  skNumber: string | null;
  skDate: Date | null;
  startOn: Date | null;
  endOn: Date | null;
  note: string | null;
}

export function parseOfficer(body: unknown): Parsed<OfficerInput> {
  if (!isRecord(body)) return notRecord();
  const fe: Record<string, string> = {};
  if (!isOfficerRole(body.role)) fe.role = "Pilih jabatan.";
  const name = reqText(body, "name", 150, "Nama", fe);
  const skNumber = optText(body, "skNumber", 100, "Nomor SK", fe);
  const skDate = optDate(body, "skDate", "Tanggal SK", fe);
  const startOn = optDate(body, "startOn", "Tanggal mulai", fe);
  const endOn = optDate(body, "endOn", "Tanggal berakhir", fe);
  if (startOn && endOn && endOn.getTime() < startOn.getTime()) fe.endOn = "Tanggal berakhir tidak boleh sebelum tanggal mulai.";
  const note = optText(body, "note", 300, "Catatan", fe);
  if (Object.keys(fe).length || !isOfficerRole(body.role) || !name) return bad(fe);
  return { ok: true, value: { role: body.role, name, skNumber, skDate, startOn, endOn, note } };
}

// ---- Arus APB Desa

export interface FlowInput {
  kind: FlowKind;
  flowDate: Date;
  amountCents: bigint;
  /** Keputusan Musyawarah Desa (plafon) yang menjadi dasar */
  resolutionId: number;
  cashAccountCode: string;
  /** Saluran kas Desa pada Buku Kas Umum APB Desa: tunai atau rekening kas desa (bank) */
  villageChannel: "TUNAI" | "BANK";
  fiscalYear: number | null;
  reference: string | null;
  note: string | null;
}

export function parseFlow(body: unknown, now: Date): Parsed<FlowInput> {
  if (!isRecord(body)) return notRecord();
  const fe: Record<string, string> = {};
  if (!isFlowKind(body.kind)) fe.kind = "Pilih penyertaan modal atau bagi hasil.";
  const flowDate = sane(parseIsoDate(body.flowDate));
  if (!flowDate) fe.flowDate = "Isi tanggal yang valid.";
  else if (future(flowDate, now)) fe.flowDate = "Tanggal tidak boleh di masa depan.";
  const amount = money(body.amount);
  if (amount.bad || amount.value === null || amount.value <= 0n) fe.amount = moneyMsg(amount, "Jumlah harus angka rupiah lebih dari nol.");
  const resolutionId = posInt(body.resolutionId);
  if (resolutionId === null) fe.resolutionId = "Pilih keputusan Musyawarah Desa yang menjadi dasarnya.";
  const cash = typeof body.cashAccountCode === "string" ? body.cashAccountCode.trim() : "";
  const cashErr = checkCashAccounts(cash, "3.1.01.01");
  if (cashErr) fe.cashAccountCode = cashErr;
  const villageChannel = blank(body.villageChannel) ? "BANK" : body.villageChannel;
  if (villageChannel !== "TUNAI" && villageChannel !== "BANK") fe.villageChannel = "Pilih kas tunai atau rekening kas desa.";
  // Tahun buku bagi hasil diambil dari keputusan Musyawarah Desa (resolusi), bukan dari isian arus.
  const fiscalYear: number | null = null;
  const reference = optText(body, "reference", 150, "Nomor bukti", fe);
  const note = optText(body, "note", 300, "Catatan", fe);
  if (Object.keys(fe).length || !isFlowKind(body.kind) || !flowDate || amount.value === null || resolutionId === null || (villageChannel !== "TUNAI" && villageChannel !== "BANK")) return bad(fe);
  return { ok: true, value: { kind: body.kind, flowDate, amountCents: amount.value, resolutionId, cashAccountCode: cash, villageChannel, fiscalYear, reference, note } };
}

// ---- Keputusan Musyawarah Desa (plafon arus APB Desa)

export interface ResolutionInput {
  kind: FlowKind;
  musdesMeetingId: number;
  decisionId: number;
  amountCents: bigint;
  fiscalYear: number | null;
  note: string | null;
}

export function parseResolution(body: unknown): Parsed<ResolutionInput> {
  if (!isRecord(body)) return notRecord();
  const fe: Record<string, string> = {};
  if (!isFlowKind(body.kind)) fe.kind = "Pilih penyertaan modal atau bagi hasil.";
  const musdesMeetingId = posInt(body.musdesMeetingId);
  if (musdesMeetingId === null) fe.musdesMeetingId = "Pilih Musyawarah Desa tentang BUM Desa (berita acara final).";
  const decisionId = posInt(body.decisionId);
  if (decisionId === null) fe.decisionId = "Pilih butir keputusan dalam berita acara yang memuat keputusan ini.";
  const amount = money(body.amount);
  if (amount.bad || amount.value === null || amount.value <= 0n) fe.amount = moneyMsg(amount, "Jumlah yang diputuskan harus angka rupiah lebih dari nol.");
  let fiscalYear: number | null = null;
  if (body.kind === "BAGI_HASIL") {
    fiscalYear = digits(body.fiscalYear);
    if (fiscalYear === null || fiscalYear < 2000 || fiscalYear > 2100) fe.fiscalYear = "Isi tahun buku asal laba.";
  }
  const note = optText(body, "note", 300, "Catatan", fe);
  if (Object.keys(fe).length || !isFlowKind(body.kind) || musdesMeetingId === null || decisionId === null || amount.value === null) return bad(fe);
  return { ok: true, value: { kind: body.kind, musdesMeetingId, decisionId, amountCents: amount.value, fiscalYear, note } };
}
