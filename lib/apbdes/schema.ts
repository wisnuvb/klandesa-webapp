/** Pemeriksa isian untuk APB Desa dan Buku Kas Umum. Murni: tidak menyentuh basis data. */
import { cleanText, future, isRecord, parseIsoDate, type Parsed } from "@/lib/form-input";
import { toCents, type Cents } from "@/lib/coop/loan-math";
import {
  ENTRY_TYPES,
  accountKind,
  isChannel,
  isEntryType,
  isFinancingReceipt,
  isFundSource,
  isKegiatanCode,
  isLeafAccountCode,
  isTaxKind,
  accountName,
  type Channel,
  type EntryType,
  type FundSource,
} from "./catalog";

const MAX_AMOUNT = 9_999_999_999_999n * 100n; // di bawah batas 13 digit toCents

/** Jumlah rupiah dari isian (angka atau teks "1500000.50"); wajib lebih dari nol. */
function amountOf(raw: unknown): Cents | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const c = toCents(raw);
  return c !== null && c > 0n && c <= MAX_AMOUNT ? c : null;
}

export interface LineInput {
  activityCode: string | null;
  accountCode: string;
  description: string;
  amountCents: Cents;
  fundSource: FundSource | null;
}

export function parseLineInput(body: unknown): Parsed<LineInput> {
  const errors: string[] = [];
  const fe: Record<string, string> = {};
  const bad = (field: string, msg: string) => {
    errors.push(msg);
    fe[field] = msg;
  };
  if (!isRecord(body)) return { ok: false, errors: ["Isian tidak terbaca"], fieldErrors: {} };

  const accountCode = typeof body.accountCode === "string" ? body.accountCode.trim() : "";
  if (!isLeafAccountCode(accountCode)) bad("accountCode", "Pilih kode rekening yang tersedia (tingkat objek, mis. 5.2.1.01)");
  const kind = accountKind(accountCode);

  const rawActivity = typeof body.activityCode === "string" ? body.activityCode.trim() : "";
  let activityCode: string | null = null;
  if (kind === "BELANJA") {
    if (!isKegiatanCode(rawActivity)) bad("activityCode", "Belanja harus memilih kegiatan (mis. 1.1.01)");
    else activityCode = rawActivity;
  } else if (rawActivity) {
    bad("activityCode", "Pendapatan dan pembiayaan tidak memakai kegiatan");
  }

  const desc = cleanText(body.description, 300);
  if (desc.bad || desc.tooLong) bad("description", "Uraian maksimal 300 karakter");
  const description = desc.value ?? accountName(accountCode) ?? "";
  if (!description) bad("description", "Uraian wajib diisi");

  const amountCents = amountOf(body.amount);
  if (amountCents === null) bad("amount", "Jumlah harus angka lebih dari nol (maks. 2 angka desimal)");

  let fundSource: FundSource | null = null;
  if (body.fundSource !== undefined && body.fundSource !== null && body.fundSource !== "") {
    if (isFundSource(body.fundSource)) fundSource = body.fundSource;
    else bad("fundSource", "Sumber dana tidak dikenal");
  }

  if (errors.length || amountCents === null) return { ok: false, errors, fieldErrors: fe };
  return { ok: true, value: { activityCode, accountCode, description, amountCents, fundSource } };
}

export interface EntryInput {
  entryDate: Date;
  voucherNo: string;
  type: EntryType;
  channel: Channel;
  activityCode: string | null;
  accountCode: string | null;
  description: string;
  amountCents: Cents;
  taxCents: Cents;
  taxKind: string | null;
  bankFee: boolean;
}

/** Catatan Buku Kas Umum. `now` dipakai untuk menolak tanggal di masa depan. */
export function parseEntryInput(body: unknown, now: Date): Parsed<EntryInput> {
  const errors: string[] = [];
  const fe: Record<string, string> = {};
  const bad = (field: string, msg: string) => {
    errors.push(msg);
    fe[field] = msg;
  };
  if (!isRecord(body)) return { ok: false, errors: ["Isian tidak terbaca"], fieldErrors: {} };

  const entryDate = parseIsoDate(body.entryDate);
  if (!entryDate) bad("entryDate", "Tanggal tidak valid");
  else if (future(entryDate, now)) bad("entryDate", "Tanggal tidak boleh di masa depan");

  const voucher = cleanText(body.voucherNo, 60);
  if (voucher.bad || voucher.tooLong || !voucher.value) bad("voucherNo", "Nomor bukti wajib diisi (maks. 60 karakter)");

  const type = body.type;
  if (!isEntryType(type)) bad("type", `Jenis catatan harus salah satu dari: ${Object.values(ENTRY_TYPES).join(", ")}`);

  let channel: Channel = "BANK";
  if (type === "TARIK_BANK") channel = "BANK";
  else if (type === "SETOR_BANK") channel = "TUNAI";
  else if (isChannel(body.channel)) channel = body.channel;
  else bad("channel", "Pilih kas tunai atau rekening bank");

  const rawAccount = typeof body.accountCode === "string" ? body.accountCode.trim() : "";
  const rawActivity = typeof body.activityCode === "string" ? body.activityCode.trim() : "";
  let accountCode: string | null = null;
  let activityCode: string | null = null;
  let bankFee = false;

  if (type === "PENERIMAAN") {
    const kind = accountKind(rawAccount);
    if (!isLeafAccountCode(rawAccount) || !(kind === "PENDAPATAN" || (kind === "PEMBIAYAAN" && isFinancingReceipt(rawAccount)))) {
      bad("accountCode", "Penerimaan memakai rekening pendapatan (4.x) atau penerimaan pembiayaan (6.1.x)");
    } else accountCode = rawAccount;
    if (rawActivity) bad("activityCode", "Penerimaan tidak memakai kegiatan");
  } else if (type === "PENGELUARAN") {
    const kind = accountKind(rawAccount);
    if (!isLeafAccountCode(rawAccount) || !(kind === "BELANJA" || (kind === "PEMBIAYAAN" && !isFinancingReceipt(rawAccount)))) {
      bad("accountCode", "Pengeluaran memakai rekening belanja (5.x) atau pengeluaran pembiayaan (6.2.x)");
    } else accountCode = rawAccount;
    if (kind === "BELANJA") {
      if (!isKegiatanCode(rawActivity)) bad("activityCode", "Belanja harus memilih kegiatan");
      else activityCode = rawActivity;
    } else if (rawActivity) bad("activityCode", "Pengeluaran pembiayaan tidak memakai kegiatan");
    bankFee = body.bankFee === true;
    if (bankFee) channel = "BANK";
  } else if (rawAccount || rawActivity) {
    bad("accountCode", "Jenis catatan ini tidak memakai kode rekening");
  }

  const desc = cleanText(body.description, 300);
  if (desc.bad || desc.tooLong || !desc.value) bad("description", "Uraian wajib diisi (maks. 300 karakter)");

  const amountCents = amountOf(body.amount);
  if (amountCents === null) bad("amount", "Jumlah harus angka lebih dari nol (maks. 2 angka desimal)");

  let taxCents = 0n;
  let taxKind: string | null = null;
  if (body.taxAmount !== undefined && body.taxAmount !== null && body.taxAmount !== "" && body.taxAmount !== 0 && body.taxAmount !== "0") {
    if (type !== "PENGELUARAN") bad("taxAmount", "Pajak hanya dipotong dari pengeluaran");
    else {
      const t = amountOf(body.taxAmount);
      if (t === null) bad("taxAmount", "Jumlah pajak harus angka lebih dari nol");
      else if (amountCents !== null && t > amountCents) bad("taxAmount", "Pajak tidak boleh melebihi jumlah pengeluaran");
      else taxCents = t;
    }
    if (taxCents > 0n) {
      if (!isTaxKind(body.taxKind)) bad("taxKind", "Pilih jenis pajak");
      else taxKind = body.taxKind;
    }
  }

  if (errors.length || amountCents === null || !entryDate || !isEntryType(type) || !voucher.value || !desc.value) {
    return { ok: false, errors, fieldErrors: fe };
  }
  return {
    ok: true,
    value: { entryDate, voucherNo: voucher.value, type, channel, activityCode, accountCode, description: desc.value, amountCents, taxCents, taxKind, bankFee },
  };
}

export interface SettingsInput {
  bankName: string | null;
  bankBranch: string | null;
  bankAccountNo: string | null;
  villageHeadName: string | null;
  secretaryName: string | null;
  treasurerName: string | null;
}

export function parseSettingsInput(body: unknown): Parsed<SettingsInput> {
  const errors: string[] = [];
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Isian tidak terbaca"], fieldErrors: {} };
  const take = (field: keyof SettingsInput, max: number, label: string): string | null => {
    const t = cleanText(body[field], max);
    if (t.bad || t.tooLong) {
      const msg = `${label} maksimal ${max} karakter`;
      errors.push(msg);
      fe[field] = msg;
    }
    return t.value;
  };
  const value: SettingsInput = {
    bankName: take("bankName", 100, "Nama bank"),
    bankBranch: take("bankBranch", 100, "Cabang bank"),
    bankAccountNo: take("bankAccountNo", 50, "Nomor rekening"),
    villageHeadName: take("villageHeadName", 150, "Nama kepala desa"),
    secretaryName: take("secretaryName", 150, "Nama sekretaris desa"),
    treasurerName: take("treasurerName", 150, "Nama kaur keuangan"),
  };
  return errors.length ? { ok: false, errors, fieldErrors: fe } : { ok: true, value };
}
