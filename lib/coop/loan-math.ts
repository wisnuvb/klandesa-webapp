/**
 * Hitungan pinjaman dan simpanan koperasi. Semua uang dihitung dalam sen memakai BigInt (tanpa float), dibulatkan ke sen terdekat.
 * Metode bunga: FLAT per bulan dari pokok awal. Angsuran = pokok/lama + bunga/lama; sisa pembulatan masuk angsuran terakhir.
 */

export type Cents = bigint;

/** "1500000.50" | 1500000.5 → sen. Menolak bentuk selain angka desimal sederhana (maks 2 digit pecahan). */
export function toCents(v: string | number): Cents | null {
  const s = typeof v === "number" ? (Number.isFinite(v) ? v.toFixed(2) : "") : v.trim();
  const m = /^(\d{1,13})(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) return null;
  return BigInt(m[1]) * 100n + BigInt((m[2] ?? "").padEnd(2, "0") || "0");
}

export function fromCents(c: Cents): string {
  const neg = c < 0n;
  const a = neg ? -c : c;
  return `${neg ? "-" : ""}${a / 100n}.${String(a % 100n).padStart(2, "0")}`;
}

/** Bagi rata `total` sen ke `n` bagian; sisa dibebankan ke bagian terakhir. */
function split(total: Cents, n: number): Cents[] {
  const base = total / BigInt(n);
  const parts = Array.from({ length: n }, () => base);
  parts[n - 1] = total - base * BigInt(n - 1);
  return parts;
}

/** a*b/c dibulatkan ke terdekat (setengah naik) untuk bilangan non-negatif. */
export const mulDivRound = (a: bigint, b: bigint, c: bigint): bigint => (a * b * 2n + c) / (c * 2n);

/** Tambah `n` bulan pada tanggal (UTC), hari dipangkas ke akhir bulan bila perlu (31 Jan + 1 bulan = 28/29 Feb). */
export function addMonths(d: Date, n: number): Date {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + n;
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(d.getUTCDate(), last)));
}

export interface Installment {
  no: number;
  dueDate: Date;
  principal: Cents;
  interest: Cents;
  total: Cents;
}

/** `ratePercent` dalam persen per bulan dengan maksimum 2 desimal (mis. "1.50"). */
export function buildSchedule(args: { principal: Cents; ratePercent: string; termMonths: number; disbursedAt: Date }): Installment[] | null {
  const { principal, termMonths } = args;
  const rate = toCents(args.ratePercent); // persen × 100 = basis poin
  if (rate === null || !Number.isInteger(termMonths) || termMonths < 1 || principal <= 0n) return null;
  const interestTotal = mulDivRound(principal * BigInt(termMonths), rate, 10_000n);
  const p = split(principal, termMonths);
  const i = split(interestTotal, termMonths);
  return p.map((pp, k) => ({ no: k + 1, dueDate: addMonths(args.disbursedAt, k + 1), principal: pp, interest: i[k], total: pp + i[k] }));
}

export interface InstallmentStatus extends Installment {
  paid: Cents;
  remaining: Cents;
  state: "LUNAS" | "SEBAGIAN" | "BELUM" | "TERLAMBAT";
}

export interface LoanPosition {
  schedule: InstallmentStatus[];
  totalDue: Cents;
  totalPaid: Cents;
  outstanding: Cents;
  principalOutstanding: Cents;
  nextDue: Date | null;
  overdueCount: number;
}

/** Pembayaran dialokasikan ke angsuran paling lama yang belum lunas. Terlambat = jatuh tempo sudah lewat dan belum lunas. */
export function loanPosition(schedule: Installment[], paid: Cents, asOf: Date): LoanPosition {
  let left = paid;
  let overdueCount = 0;
  let nextDue: Date | null = null;
  let principalPaid = 0n;
  const rows: InstallmentStatus[] = schedule.map((s) => {
    const used = left >= s.total ? s.total : left;
    left -= used;
    const remaining = s.total - used;
    // Porsi pokok dari pembayaran: bunga dilunasi lebih dulu dalam tiap angsuran.
    principalPaid += used > s.interest ? used - s.interest : 0n;
    const late = remaining > 0n && s.dueDate.getTime() < Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate());
    const state: InstallmentStatus["state"] = remaining === 0n ? "LUNAS" : late ? "TERLAMBAT" : used > 0n ? "SEBAGIAN" : "BELUM";
    if (late) overdueCount++;
    if (remaining > 0n && nextDue === null) nextDue = s.dueDate;
    return { ...s, paid: used, remaining, state };
  });
  const totalDue = schedule.reduce((a, s) => a + s.total, 0n);
  const principalTotal = schedule.reduce((a, s) => a + s.principal, 0n);
  return { schedule: rows, totalDue, totalPaid: paid, outstanding: totalDue - paid > 0n ? totalDue - paid : 0n, principalOutstanding: principalTotal - principalPaid, nextDue, overdueCount };
}

export interface ShuInput {
  /** Total SHU yang dibagikan ke anggota (sudah dipotong cadangan dll. sesuai keputusan RAT), dalam sen. */
  total: Cents;
  /** Persentase (0-100) dari `total` untuk jasa simpanan; sisanya untuk jasa pinjaman. */
  savingsSharePercent: number;
  members: { id: number; savings: Cents; loanInterestPaid: Cents }[];
}

export interface ShuRow {
  id: number;
  fromSavings: Cents;
  fromLoans: Cents;
  total: Cents;
}

/**
 * Bagi SHU: porsi simpanan sebanding saldo simpanan anggota, porsi pinjaman sebanding bunga yang dibayar anggota.
 * Pembulatan ke bawah per anggota; sisa sen tidak dibagikan (dilaporkan). Bila satu porsi tak punya dasar pembagi (nol), porsi itu tidak dibagikan.
 */
export function distributeShu(input: ShuInput): { rows: ShuRow[]; distributed: Cents; undistributed: Cents } {
  const sharePermille = BigInt(Math.round(input.savingsSharePercent * 10));
  const savingsPool = (input.total * sharePermille) / 1000n;
  const loansPool = input.total - savingsPool;
  const sumSav = input.members.reduce((a, m) => a + m.savings, 0n);
  const sumInt = input.members.reduce((a, m) => a + m.loanInterestPaid, 0n);
  const rows = input.members.map((m) => {
    const fromSavings = sumSav > 0n ? (savingsPool * m.savings) / sumSav : 0n;
    const fromLoans = sumInt > 0n ? (loansPool * m.loanInterestPaid) / sumInt : 0n;
    return { id: m.id, fromSavings, fromLoans, total: fromSavings + fromLoans };
  });
  const distributed = rows.reduce((a, r) => a + r.total, 0n);
  return { rows, distributed, undistributed: input.total - distributed };
}

/** Bunga yang sudah terbayar dari total pembayaran `paid` (bunga dilunasi lebih dulu dalam tiap angsuran, angsuran terlama dulu). */
export function interestPaid(schedule: Installment[], paid: Cents): Cents {
  let left = paid;
  let total = 0n;
  for (const s of schedule) {
    const used = left >= s.total ? s.total : left;
    left -= used;
    total += used < s.interest ? used : s.interest;
  }
  return total;
}
