/**
 * Periode & batas waktu untuk dasbor owner. MURNI (tanpa DB).
 *
 * Zona waktu tampilan: WIB (Asia/Jakarta, UTC+7, tanpa DST). Basis data menyimpan UTC, jadi batas hari/bulan WIB
 * dihitung di sini sebagai instan UTC (mis. 1 Februari 00:00 WIB = 31 Januari 17:00 UTC). Pembuatan kunci bucket di SQL
 * memakai `DATE_ADD(kolom, INTERVAL 7 HOUR)` (tanpa CONVERT_TZ agar tidak bergantung pada tabel zona waktu MySQL).
 */
export const WIB_TIMEZONE = "Asia/Jakarta";
export const WIB_OFFSET_HOURS = 7;
export const WIB_OFFSET_MS = WIB_OFFSET_HOURS * 3_600_000;
export const DAY_MS = 86_400_000;

export const MONTH_SHORT_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"] as const;
export const MONTH_LONG_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember",
] as const;

export type WibParts = { year: number; month: number; day: number; hour: number; minute: number };

/** Komponen kalender WIB dari satu instan. `month` 1-12. */
export function wibParts(d: Date): WibParts {
  const s = new Date(d.getTime() + WIB_OFFSET_MS);
  return { year: s.getUTCFullYear(), month: s.getUTCMonth() + 1, day: s.getUTCDate(), hour: s.getUTCHours(), minute: s.getUTCMinutes() };
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** "2026-11-06" menurut kalender WIB. */
export function wibDayKey(d: Date): string {
  const p = wibParts(d);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

/** "2026-11" menurut kalender WIB. */
export function wibMonthKey(d: Date): string {
  const p = wibParts(d);
  return `${p.year}-${pad2(p.month)}`;
}

/** Instan UTC dari 00:00 WIB pada hari yang memuat `d`. */
export function wibStartOfDay(d: Date): Date {
  const p = wibParts(d);
  return new Date(Date.UTC(p.year, p.month - 1, p.day) - WIB_OFFSET_MS);
}

/** Instan UTC dari tanggal 1 pukul 00:00 WIB. `month` 1-12; nilai di luar rentang digulirkan (13 = Januari tahun depan). */
export function wibStartOfMonth(year: number, month: number): Date {
  return new Date(Date.UTC(year, month - 1, 1) - WIB_OFFSET_MS);
}

/** Awal bulan WIB yang memuat `d`, digeser `delta` bulan. */
export function wibMonthStartShifted(d: Date, delta: number): Date {
  const p = wibParts(d);
  return wibStartOfMonth(p.year, p.month + delta);
}

export type RevenueRange = "30d" | "90d" | "12m" | "ytd";
export const REVENUE_RANGES: readonly RevenueRange[] = ["30d", "90d", "12m", "ytd"];
export const REVENUE_RANGE_LABEL: Record<RevenueRange, string> = {
  "30d": "30 hari terakhir",
  "90d": "90 hari terakhir",
  "12m": "12 bulan terakhir",
  ytd: "Tahun ini (sejak 1 Januari)",
};

export function parseRevenueRange(v: unknown): RevenueRange | null {
  return typeof v === "string" && (REVENUE_RANGES as readonly string[]).includes(v) ? (v as RevenueRange) : null;
}

export type Granularity = "day" | "month";
export type Bucket = { key: string; label: string; start: Date; end: Date };

export type ResolvedRange = {
  range: RevenueRange;
  granularity: Granularity;
  /** Inklusif. */
  from: Date;
  /** Eksklusif. */
  to: Date;
  /** Periode pembanding dengan panjang setara, tepat sebelum `from` (atau tahun lalu untuk ytd). */
  prevFrom: Date;
  prevTo: Date;
  buckets: Bucket[];
};

function dayBuckets(from: Date, days: number): Bucket[] {
  const out: Bucket[] = [];
  for (let i = 0; i < days; i++) {
    const start = new Date(from.getTime() + i * DAY_MS);
    const p = wibParts(start);
    out.push({ key: wibDayKey(start), label: `${p.day} ${MONTH_SHORT_ID[p.month - 1]}`, start, end: new Date(start.getTime() + DAY_MS) });
  }
  return out;
}

function monthBuckets(firstMonthStart: Date, count: number, withYear: boolean): Bucket[] {
  const out: Bucket[] = [];
  for (let i = 0; i < count; i++) {
    const start = wibMonthStartShifted(firstMonthStart, i);
    const p = wibParts(start);
    out.push({
      key: wibMonthKey(start),
      label: withYear ? `${MONTH_SHORT_ID[p.month - 1]} ${String(p.year).slice(2)}` : MONTH_SHORT_ID[p.month - 1],
      start,
      end: wibMonthStartShifted(start, 1),
    });
  }
  return out;
}

/** Rentang laporan pendapatan. Hari ini (WIB) selalu ikut, walau belum selesai. */
export function resolveRevenueRange(range: RevenueRange, now: Date): ResolvedRange {
  if (range === "30d" || range === "90d") {
    const days = range === "30d" ? 30 : 90;
    const to = new Date(wibStartOfDay(now).getTime() + DAY_MS);
    const from = new Date(to.getTime() - days * DAY_MS);
    return { range, granularity: "day", from, to, prevFrom: new Date(from.getTime() - days * DAY_MS), prevTo: from, buckets: dayBuckets(from, days) };
  }
  const to = wibMonthStartShifted(now, 1);
  if (range === "12m") {
    const from = wibMonthStartShifted(now, -11);
    return { range, granularity: "month", from, to, prevFrom: wibMonthStartShifted(from, -12), prevTo: from, buckets: monthBuckets(from, 12, true) };
  }
  // ytd: 1 Januari WIB s.d. akhir bulan berjalan; pembanding = rentang yang sama tahun lalu.
  const p = wibParts(now);
  const from = wibStartOfMonth(p.year, 1);
  return {
    range, granularity: "month", from, to,
    prevFrom: wibStartOfMonth(p.year - 1, 1), prevTo: wibStartOfMonth(p.year - 1, p.month + 1),
    buckets: monthBuckets(from, p.month, false),
  };
}

/** Bulan berjalan sejak tanggal 1 vs. bulan lalu pada rentang waktu yang sama (adil untuk perbandingan sebagian bulan). */
export function resolveMonthComparison(now: Date) {
  const thisStart = wibMonthStartShifted(now, 0);
  const lastStart = wibMonthStartShifted(now, -1);
  const elapsed = now.getTime() - thisStart.getTime();
  const lastSamePeriodEnd = new Date(Math.min(lastStart.getTime() + elapsed, thisStart.getTime()));
  return { thisStart, thisEnd: now, lastStart, lastEnd: thisStart, lastSamePeriodEnd };
}

/** 12 bucket bulan terakhir (termasuk bulan berjalan), terlama dulu. */
export function last12MonthBuckets(now: Date): Bucket[] {
  return monthBuckets(wibMonthStartShifted(now, -11), 12, true);
}
