/**
 * Hitungan Buku Kas Umum dan buku pembantu (Permendagri 20/2018 Pasal 63-64, Lampiran P dan Q). Murni, uang dalam sen.
 *
 * Aturan saldo: setiap catatan memengaruhi tiga saldo: kas tunai, rekening bank, dan titipan pajak.
 * - Penerimaan: menambah saldo kanal yang dipilih.
 * - Pengeluaran: belanja dicatat sebesar jumlah penuh (bruto). Pajak yang dipotong tetap tertahan di kas
 *   (titipan pajak naik), sehingga uang yang benar-benar keluar = jumlah dikurangi pajak.
 * - Setoran pajak: mengurangi kanal dan titipan pajak sebesar jumlahnya.
 * - Tarik tunai / setor tunai: memindahkan uang antara bank dan tunai, tidak mengubah saldo kas gabungan.
 */
import type { Cents } from "@/lib/coop/loan-math";
import { BANK_INTEREST_CODE, type Channel, type LedgerEntryType } from "./catalog";

export interface LedgerEntry {
  id: number;
  entryDate: string; // YYYY-MM-DD
  voucherNo: string;
  type: LedgerEntryType;
  channel: Channel;
  activityCode: string | null;
  accountCode: string | null;
  description: string;
  amountCents: Cents;
  taxCents: Cents;
  taxKind: string | null;
  bankFee: boolean;
  /** Asal catatan: SPP yang dibayar atau panjar yang dikembalikan sisanya (kosong untuk catatan manual) */
  requestId?: number | null;
  panjarId?: number | null;
}

export interface Balances {
  tunai: Cents;
  bank: Cents;
  pajak: Cents;
}

export const sortEntries = (list: LedgerEntry[]): LedgerEntry[] =>
  [...list].sort((a, b) => (a.entryDate < b.entryDate ? -1 : a.entryDate > b.entryDate ? 1 : a.id - b.id));

/** Perubahan saldo akibat satu catatan. */
export function effectOf(e: LedgerEntry): Balances {
  const z: Balances = { tunai: 0n, bank: 0n, pajak: 0n };
  const net = e.amountCents - e.taxCents;
  const slot = e.channel === "BANK" ? "bank" : "tunai";
  switch (e.type) {
    case "PENERIMAAN":
    case "PANJAR_KEMBALI":
      z[slot] += e.amountCents;
      break;
    case "PENGELUARAN":
      z[slot] -= net;
      z.pajak += e.taxCents;
      break;
    case "SETOR_PAJAK":
      z[slot] -= e.amountCents;
      z.pajak -= e.amountCents;
      break;
    case "TARIK_BANK":
      z.bank -= e.amountCents;
      z.tunai += e.amountCents;
      break;
    case "SETOR_BANK":
      z.tunai -= e.amountCents;
      z.bank += e.amountCents;
      break;
  }
  return z;
}

const rp = (c: Cents): string => `Rp${(c / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

/** Menjalankan seluruh catatan berurutan dan mengembalikan pesan galat pertama bila ada saldo yang jatuh di bawah nol. */
export function checkLedger(list: LedgerEntry[]): string | null {
  const bal: Balances = { tunai: 0n, bank: 0n, pajak: 0n };
  for (const e of sortEntries(list)) {
    const fx = effectOf(e);
    bal.tunai += fx.tunai;
    bal.bank += fx.bank;
    bal.pajak += fx.pajak;
    const where = `${e.entryDate}, bukti ${e.voucherNo}`;
    if (bal.tunai < 0n) return `Kas tunai kurang (${where}); saldo menjadi -${rp(-bal.tunai)}. Catat dulu penerimaan atau tarik tunai dari bank.`;
    if (bal.bank < 0n) return `Saldo rekening bank kurang (${where}); saldo menjadi -${rp(-bal.bank)}. Catat dulu penerimaan atau setor tunai ke bank.`;
    if (bal.pajak < 0n) return `Setoran pajak melebihi pajak yang dipotong (${where}).`;
  }
  return null;
}

export function balancesOf(list: LedgerEntry[], untilDate?: string): Balances {
  const bal: Balances = { tunai: 0n, bank: 0n, pajak: 0n };
  for (const e of list) {
    if (untilDate && e.entryDate > untilDate) continue;
    const fx = effectOf(e);
    bal.tunai += fx.tunai;
    bal.bank += fx.bank;
    bal.pajak += fx.pajak;
  }
  return bal;
}

export const monthOf = (isoDate: string): number => Number(isoDate.slice(5, 7));

// ---- Buku Kas Umum (Lampiran P)

export interface BkuRow {
  no: number;
  date: string;
  accountCode: string;
  description: string;
  receipt: Cents;
  expense: Cents;
  voucherNo: string;
  net: Cents;
  balance: Cents;
}
export interface Bku {
  openingBalance: Cents;
  rows: BkuRow[];
  totalReceipt: Cents;
  totalExpense: Cents;
  closingBalance: Cents;
}

/** BKU bulan tertentu (atau seluruh tahun bila `month` kosong). Pindah buku bank-tunai tidak tampil karena saldo gabungan tidak berubah. */
export function buildBku(list: LedgerEntry[], month?: number): Bku {
  let balance = 0n;
  let opening: Cents | null = month === undefined ? 0n : null;
  const rows: BkuRow[] = [];
  let totalReceipt = 0n;
  let totalExpense = 0n;
  const push = (e: LedgerEntry, description: string, receipt: Cents, expense: Cents, code: string) => {
    balance += receipt - expense;
    totalReceipt += receipt;
    totalExpense += expense;
    rows.push({ no: rows.length + 1, date: e.entryDate, accountCode: code, description, receipt, expense, voucherNo: e.voucherNo, net: receipt - expense, balance });
  };
  for (const e of sortEntries(list)) {
    const m = monthOf(e.entryDate);
    if (month !== undefined && m > month) break;
    if (opening === null && m >= month!) opening = balance;
    if (month !== undefined && m < month) {
      const fx = effectOf(e);
      balance += fx.tunai + fx.bank;
      continue;
    }
    if (e.type === "TARIK_BANK" || e.type === "SETOR_BANK") continue;
    if (e.type === "PENERIMAAN") push(e, e.description, e.amountCents, 0n, e.accountCode ?? "");
    else if (e.type === "PANJAR_KEMBALI") push(e, e.description, e.amountCents, 0n, [e.activityCode, e.accountCode].filter(Boolean).join(" / "));
    else if (e.type === "PENGELUARAN") {
      push(e, e.description, 0n, e.amountCents, [e.activityCode, e.accountCode].filter(Boolean).join(" / "));
      if (e.taxCents > 0n) push(e, `Pemotongan ${e.taxKind ?? "pajak"}: ${e.description}`, e.taxCents, 0n, "");
    } else push(e, e.description, 0n, e.amountCents, "");
  }
  return { openingBalance: opening ?? balance, rows, totalReceipt, totalExpense, closingBalance: balance };
}

// ---- Buku Pembantu Bank (Q.1)

export interface BankRow {
  no: number;
  date: string;
  description: string;
  voucherNo: string;
  deposit: Cents;
  interest: Cents;
  withdrawal: Cents;
  tax: Cents;
  fee: Cents;
  balance: Cents;
}
export interface BankBook {
  openingBalance: Cents;
  rows: BankRow[];
  total: { deposit: Cents; interest: Cents; withdrawal: Cents; tax: Cents; fee: Cents };
  /** Total sejak awal tahun sampai akhir periode (baris "total transaksi kumulatif" Lampiran Q.1) */
  cumulative: { deposit: Cents; interest: Cents; withdrawal: Cents; tax: Cents; fee: Cents };
  closingBalance: Cents;
}

export function buildBankBook(list: LedgerEntry[], month?: number): BankBook {
  let balance = 0n;
  let opening: Cents | null = month === undefined ? 0n : null;
  const rows: BankRow[] = [];
  const total = { deposit: 0n, interest: 0n, withdrawal: 0n, tax: 0n, fee: 0n };
  const cumulative = { deposit: 0n, interest: 0n, withdrawal: 0n, tax: 0n, fee: 0n };
  for (const e of sortEntries(list)) {
    const m = monthOf(e.entryDate);
    if (month !== undefined && m > month) break;
    if (opening === null && m >= month!) opening = balance;
    const viaBank = e.type === "TARIK_BANK" || e.type === "SETOR_BANK" || e.channel === "BANK";
    if (!viaBank) continue;
    const row: BankRow = { no: 0, date: e.entryDate, description: e.description, voucherNo: e.voucherNo, deposit: 0n, interest: 0n, withdrawal: 0n, tax: 0n, fee: 0n, balance: 0n };
    if (e.type === "PENERIMAAN") {
      if (e.accountCode === BANK_INTEREST_CODE) row.interest = e.amountCents;
      else row.deposit = e.amountCents;
    } else if (e.type === "SETOR_BANK" || e.type === "PANJAR_KEMBALI") row.deposit = e.amountCents;
    else if (e.type === "TARIK_BANK") row.withdrawal = e.amountCents;
    else if (e.type === "SETOR_PAJAK") row.tax = e.amountCents;
    else if (e.bankFee) row.fee = e.amountCents - e.taxCents;
    else row.withdrawal = e.amountCents - e.taxCents;
    balance += effectOf(e).bank;
    for (const k of Object.keys(cumulative) as (keyof typeof cumulative)[]) cumulative[k] += row[k];
    if (month !== undefined && m !== month) continue;
    row.no = rows.length + 1;
    row.balance = balance;
    rows.push(row);
    for (const k of Object.keys(total) as (keyof typeof total)[]) total[k] += row[k];
  }
  return { openingBalance: opening ?? balance, rows, total, cumulative, closingBalance: balance };
}

// ---- Buku Kas Pembantu Pajak (Q.2)

export interface TaxRow {
  no: number;
  date: string;
  description: string;
  withheld: Cents;
  deposited: Cents;
  balance: Cents;
}
export interface TaxBook {
  rows: TaxRow[];
  totalWithheld: Cents;
  totalDeposited: Cents;
  balance: Cents;
}

export function buildTaxBook(list: LedgerEntry[]): TaxBook {
  let balance = 0n;
  const rows: TaxRow[] = [];
  let totalWithheld = 0n;
  let totalDeposited = 0n;
  for (const e of sortEntries(list)) {
    if (e.type === "PENGELUARAN" && e.taxCents > 0n) {
      balance += e.taxCents;
      totalWithheld += e.taxCents;
      rows.push({ no: rows.length + 1, date: e.entryDate, description: `Pemotongan ${e.taxKind ?? "pajak"}: ${e.description}`, withheld: e.taxCents, deposited: 0n, balance });
    } else if (e.type === "SETOR_PAJAK") {
      balance -= e.amountCents;
      totalDeposited += e.amountCents;
      rows.push({ no: rows.length + 1, date: e.entryDate, description: e.description, withheld: 0n, deposited: e.amountCents, balance });
    }
  }
  return { rows, totalWithheld, totalDeposited, balance };
}
