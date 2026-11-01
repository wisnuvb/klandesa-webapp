/**
 * Perhitungan murni BUM Desa (tanpa Prisma): pemeriksaan jurnal berpasangan, periode semester/tahunan, penomoran bukti, serta
 * laporan posisi keuangan (neraca) dan laba rugi per unit usaha dan gabungan. Uang dalam sen (BigInt).
 * Dasar [V]: PP 11/2021 Pasal 58 (laporan semesteran = posisi keuangan + laba rugi; tahunan = ditambah gabungan unit usaha) dan
 * Kepmendes PDTT 136/2022 (tata buku berpasangan, bagan akun, akun resiprokal dieliminasi saat penggabungan).
 */
import { ACCOUNTS, EQUITY_VILLAGE_CAPITAL, EQUITY_VILLAGE_PROFIT_SHARE, FLOW_ONLY_ACCOUNTS, LIMITS, accountOf, isAccountCode, isCashAccount, isReciprocal, type Account, type AccountClass, type PeriodKind } from "./catalog";

export const MAX_CENTS = 99_999_999_999_999n;

export interface JLine {
  accountCode: string;
  debitCents: bigint;
  creditCents: bigint;
  memo: string | null;
}

const rp = (c: bigint): string => `Rp${new Intl.NumberFormat("id-ID").format(c / 100n)}`;

/** Pemeriksaan satu jurnal: akun dikenal, satu sisi per baris, debit sama dengan kredit. Mengembalikan daftar galat (kosong = sah). */
export function checkLines(lines: readonly JLine[]): string[] {
  const errors: string[] = [];
  if (lines.length < 2) errors.push("Jurnal minimal terdiri atas dua baris (satu debit dan satu kredit).");
  if (lines.length > LIMITS.linesPerJournal) errors.push(`Jurnal paling banyak ${LIMITS.linesPerJournal} baris.`);
  let debit = 0n;
  let credit = 0n;
  lines.forEach((l, i) => {
    const n = i + 1;
    if (!isAccountCode(l.accountCode)) errors.push(`Baris ${n}: akun tidak dikenal.`);
    const d = l.debitCents > 0n;
    const c = l.creditCents > 0n;
    if (l.debitCents < 0n || l.creditCents < 0n) errors.push(`Baris ${n}: jumlah tidak boleh negatif.`);
    else if (d === c) errors.push(`Baris ${n}: isi tepat satu sisi, debit atau kredit, dengan jumlah lebih dari nol.`);
    else if (l.debitCents > MAX_CENTS || l.creditCents > MAX_CENTS) errors.push(`Baris ${n}: jumlah terlalu besar.`);
    debit += l.debitCents > 0n ? l.debitCents : 0n;
    credit += l.creditCents > 0n ? l.creditCents : 0n;
  });
  if (!errors.length && debit !== credit) errors.push(`Jurnal tidak seimbang: debit ${rp(debit)} berbeda dari kredit ${rp(credit)}.`);
  if (!errors.length && debit === 0n) errors.push("Jumlah jurnal harus lebih dari nol.");
  return errors;
}

/**
 * Akun Penyertaan Modal Desa dan Bagi Hasil hanya boleh dijurnal oleh arus APB Desa (MODAL memakai 3.1.01.01, BAGI_HASIL memakai 3.2.01.01).
 * Jurnal pembukaan (SALDO_AWAL) boleh memakai 3.1.01.01. Sumber lain (MANUAL, KAS) tidak boleh memakai keduanya. Mengembalikan pesan galat atau null.
 */
export function reservedAccountViolation(source: string, lines: readonly JLine[]): string | null {
  for (const l of lines) {
    if (!FLOW_ONLY_ACCOUNTS.includes(l.accountCode)) continue;
    const ok = (source === "MODAL" && l.accountCode === EQUITY_VILLAGE_CAPITAL) || (source === "BAGI_HASIL" && l.accountCode === EQUITY_VILLAGE_PROFIT_SHARE) || (source === "SALDO_AWAL" && l.accountCode === EQUITY_VILLAGE_CAPITAL);
    if (!ok) return `Akun ${l.accountCode} hanya dicatat lewat tab Dana Desa (keputusan Musyawarah Desa dan Buku Kas Umum APB Desa).`;
  }
  return null;
}

export function totalsOf(lines: readonly JLine[]): { debit: bigint; credit: bigint } {
  let debit = 0n;
  let credit = 0n;
  for (const l of lines) {
    debit += l.debitCents;
    credit += l.creditCents;
  }
  return { debit, credit };
}

/** Jurnal turunan transaksi kas: pemasukan = debit kas, kredit akun lawan; pengeluaran = debit akun lawan, kredit kas. */
export function cashJournalLines(args: { direction: "income" | "expense"; amountCents: bigint; cashAccount: string; counterAccount: string; memo: string | null }): JLine[] {
  const { direction, amountCents: a, cashAccount, counterAccount, memo } = args;
  return direction === "income"
    ? [
        { accountCode: cashAccount, debitCents: a, creditCents: 0n, memo },
        { accountCode: counterAccount, debitCents: 0n, creditCents: a, memo },
      ]
    : [
        { accountCode: counterAccount, debitCents: a, creditCents: 0n, memo },
        { accountCode: cashAccount, debitCents: 0n, creditCents: a, memo },
      ];
}

/** Aturan akun untuk transaksi kas: akun kas harus 1.1.01.xx; akun lawan dikenal dan bukan akun kas yang sama. */
export function checkCashAccounts(cashAccount: string, counterAccount: string): string | null {
  if (!isCashAccount(cashAccount)) return "Pilih akun kas atau bank (1.1.01.xx).";
  if (!isAccountCode(counterAccount)) return "Akun lawan tidak dikenal.";
  if (counterAccount === cashAccount) return "Akun lawan tidak boleh sama dengan akun kas.";
  return null;
}

// ---- Periode

export type Half = 1 | 2;
const pad = (n: number, w = 2) => String(n).padStart(w, "0");

export function periodOfDate(iso: string): { year: number; half: Half } {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  return { year: y, half: m <= 6 ? 1 : 2 };
}

export function halvesOf(kind: PeriodKind): Half[] {
  return kind === "S1" ? [1] : kind === "S2" ? [2] : [1, 2];
}

export interface PeriodRange {
  year: number;
  kind: PeriodKind;
  /** Tanggal awal dan akhir periode laporan (termasuk) */
  start: string;
  end: string;
  /** Awal tahun buku (1 Januari) */
  yearStart: string;
  label: string;
}

export function rangeOf(year: number, kind: PeriodKind): PeriodRange {
  const start = kind === "S2" ? `${year}-07-01` : `${year}-01-01`;
  const end = kind === "S1" ? `${year}-06-30` : `${year}-12-31`;
  const label = kind === "S1" ? `Semester I ${year}` : kind === "S2" ? `Semester II ${year}` : `Tahun buku ${year}`;
  return { year, kind, start, end, yearStart: `${year}-01-01`, label };
}

/** Akhir semester sudah lewat pada saat `now` (periode baru dapat ditutup sesudah berakhir). */
export function halfEnded(year: number, half: Half, now: Date): boolean {
  const next = half === 1 ? Date.UTC(year, 6, 1) : Date.UTC(year + 1, 0, 1);
  return now.getTime() >= next;
}

/** No. urut/No. bulan/Kode unit usaha/Tahun (Kepmendes 136/2022 Bab V.A). Kantor pusat memakai kode PUSAT. */
export function voucherNumber(seq: number, iso: string, unitId: number | null): string {
  return `${pad(seq, 4)}/${iso.slice(5, 7)}/${unitId === null ? "PUSAT" : `U${unitId}`}/${iso.slice(0, 4)}`;
}

// ---- Laporan

/** Saldo satu akun pada satu entitas (debit dikurangi kredit), dipecah menurut waktu relatif terhadap periode laporan. */
export interface BalanceRow {
  unitId: number | null;
  accountCode: string;
  /** sebelum awal tahun buku */
  prior: bigint;
  /** awal tahun buku sampai sebelum awal periode */
  ytdBefore: bigint;
  /** di dalam periode laporan */
  inPeriod: bigint;
}

export interface StatementLine {
  code: string;
  name: string;
  /** Jumlah pada sisi penyajian (aset: debit-kredit; lainnya: kredit-debit; beban: debit-kredit). Akun kontra tampil negatif. */
  amount: bigint;
}
export interface Section {
  label: string;
  lines: StatementLine[];
  total: bigint;
}

export interface Neraca {
  asOf: string;
  aset: Section;
  kewajiban: Section;
  ekuitas: Section;
  totalAset: bigint;
  totalKewajibanEkuitas: bigint;
  /** totalAset - totalKewajibanEkuitas; 0 bila seimbang */
  difference: bigint;
  balanced: boolean;
}

export interface LabaRugi {
  period: string;
  pendapatan: Section;
  hpp: Section;
  labaKotor: bigint;
  beban: Section;
  labaUsaha: bigint;
  pendapatanLain: Section;
  bebanLain: Section;
  labaSebelumPajak: bigint;
  bebanPajak: Section;
  labaBersih: bigint;
}

export interface Statements {
  unitId: number | null;
  name: string;
  neraca: Neraca;
  labaRugi: LabaRugi;
  /** Transaksi pada entitas ini sama sekali belum ada (semua saldo nol) */
  empty: boolean;
}

export interface Elimination {
  /** Saldo (debit-kredit) gabungan akun resiprokal sebelum eliminasi */
  rkUnit: bigint;
  rkPusat: bigint;
  /** rkUnit + rkPusat: harus nol agar saling meniadakan */
  residual: bigint;
}

export interface Report {
  range: PeriodRange;
  entities: Statements[];
  consolidated: Statements;
  elimination: Elimination;
}

const CLASS_LABEL: Record<AccountClass, string> = {
  ASET: "ASET",
  KEWAJIBAN: "KEWAJIBAN",
  EKUITAS: "EKUITAS",
  PENDAPATAN: "PENDAPATAN USAHA",
  HPP: "HARGA POKOK PENJUALAN",
  BEBAN: "BEBAN USAHA",
  PENDAPATAN_LAIN: "PENDAPATAN LAIN-LAIN",
  BEBAN_LAIN: "BEBAN LAIN-LAIN",
  BEBAN_PAJAK: "BEBAN PAJAK",
};

const ORDER = new Map(ACCOUNTS.map((a, i) => [a.code, i]));

function section(cls: AccountClass, byCode: Map<string, bigint>, sign: 1n | -1n, extra: StatementLine[] = [], hide?: (code: string) => boolean): Section {
  const lines: StatementLine[] = [];
  for (const [code, signed] of byCode) {
    const a = accountOf(code);
    if (!a || a.cls !== cls || signed === 0n || hide?.(code)) continue;
    lines.push({ code, name: a.name, amount: signed * sign });
  }
  lines.sort((x, y) => (ORDER.get(x.code) ?? 0) - (ORDER.get(y.code) ?? 0));
  lines.push(...extra);
  return { label: CLASS_LABEL[cls], lines, total: lines.reduce((t, l) => t + l.amount, 0n) };
}

/** Laporan satu entitas dari barisan saldonya. `hide` menyembunyikan akun (akun resiprokal pada penggabungan). */
export function statementsFor(args: { unitId: number | null; name: string; rows: readonly BalanceRow[]; range: PeriodRange; hide?: (code: string) => boolean }): Statements {
  const { rows, range, hide } = args;
  const closing = new Map<string, bigint>();
  const period = new Map<string, bigint>();
  let prior = 0n;
  let ytd = 0n;
  let any = false;
  for (const r of rows) {
    const a = accountOf(r.accountCode);
    if (!a) continue;
    if (r.prior !== 0n || r.ytdBefore !== 0n || r.inPeriod !== 0n) any = true;
    if (a.cls === "ASET" || a.cls === "KEWAJIBAN" || a.cls === "EKUITAS") {
      closing.set(r.accountCode, (closing.get(r.accountCode) ?? 0n) + r.prior + r.ytdBefore + r.inPeriod);
    } else {
      prior += r.prior;
      ytd += r.ytdBefore + r.inPeriod;
      period.set(r.accountCode, (period.get(r.accountCode) ?? 0n) + r.inPeriod);
    }
  }

  const pendapatan = section("PENDAPATAN", period, -1n);
  const hpp = section("HPP", period, 1n);
  const beban = section("BEBAN", period, 1n);
  const pendapatanLain = section("PENDAPATAN_LAIN", period, -1n);
  const bebanLain = section("BEBAN_LAIN", period, 1n);
  const bebanPajak = section("BEBAN_PAJAK", period, 1n);
  const labaKotor = pendapatan.total - hpp.total;
  const labaUsaha = labaKotor - beban.total;
  const labaSebelumPajak = labaUsaha + pendapatanLain.total - bebanLain.total;
  const labaBersih = labaSebelumPajak - bebanPajak.total;

  // Laba (rugi) ditahan tahun-tahun lalu dan tahun berjalan dihitung dari akun nominal (tanpa jurnal penutup).
  const labaLalu = -prior;
  const labaBerjalan = -ytd;
  const aset = section("ASET", closing, 1n, [], hide);
  const kewajiban = section("KEWAJIBAN", closing, -1n, [], hide);
  const ekuitas = section("EKUITAS", closing, -1n, [
    { code: "LABA-LALU", name: "Laba (rugi) tahun-tahun sebelumnya", amount: labaLalu },
    { code: "LABA-BERJALAN", name: `Laba (rugi) tahun berjalan s.d. ${range.end}`, amount: labaBerjalan },
  ], hide);
  const totalKE = kewajiban.total + ekuitas.total;
  const difference = aset.total - totalKE;
  return {
    unitId: args.unitId,
    name: args.name,
    empty: !any,
    neraca: { asOf: range.end, aset, kewajiban, ekuitas, totalAset: aset.total, totalKewajibanEkuitas: totalKE, difference, balanced: difference === 0n },
    labaRugi: { period: range.label, pendapatan, hpp, labaKotor, beban, labaUsaha, pendapatanLain, bebanLain, labaSebelumPajak, bebanPajak, labaBersih },
  };
}

/** Laporan per entitas (unit usaha + kantor pusat) dan gabungan; akun resiprokal dieliminasi pada gabungan. */
export function buildReport(args: { range: PeriodRange; entities: readonly { unitId: number | null; name: string }[]; rows: readonly BalanceRow[] }): Report {
  const { range, rows } = args;
  const byEntity = new Map<number | null, BalanceRow[]>();
  for (const r of rows) {
    const list = byEntity.get(r.unitId) ?? [];
    list.push(r);
    byEntity.set(r.unitId, list);
  }
  const entities = args.entities.map((e) => statementsFor({ unitId: e.unitId, name: e.name, rows: byEntity.get(e.unitId) ?? [], range }));

  // Gabungan: jumlahkan saldo akun yang sama di seluruh entitas, sembunyikan akun resiprokal, laporkan sisa yang tak saling meniadakan.
  const merged = new Map<string, BalanceRow>();
  for (const r of rows) {
    const cur = merged.get(r.accountCode) ?? { unitId: null, accountCode: r.accountCode, prior: 0n, ytdBefore: 0n, inPeriod: 0n };
    merged.set(r.accountCode, { ...cur, prior: cur.prior + r.prior, ytdBefore: cur.ytdBefore + r.ytdBefore, inPeriod: cur.inPeriod + r.inPeriod });
  }
  const bal = (code: string): bigint => {
    const r = merged.get(code);
    return r ? r.prior + r.ytdBefore + r.inPeriod : 0n;
  };
  const rkUnit = bal("1.1.99.01");
  const rkPusat = bal("3.8.01.01");
  const consolidated = statementsFor({ unitId: null, name: "Gabungan (konsolidasi)", rows: [...merged.values()], range, hide: isReciprocal });
  return { range, entities, consolidated, elimination: { rkUnit, rkPusat, residual: rkUnit + rkPusat } };
}

export type { Account };
