/** Aturan murni cermin data pangan: deteksi "ada data", masa segar (TTL), dan aritmetika tanggal. */

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Daftar kab/kota berubah sangat jarang. */
export const WILAYAH_TTL_MS = 7 * DAY;
/** Setelah gagal, jangan mencoba lagi ke sumber untuk baris yang sama selama ini. */
export const RETRY_COOLDOWN_MS = 60_000;

const ISO_DATE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

export function isIsoDate(v: string): boolean {
  if (!ISO_DATE.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

export function addDaysIso(date: string, delta: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Tanggal hari ini di WIB (UTC+7), format YYYY-MM-DD. */
export function todayWib(now: Date = new Date()): string {
  return new Date(now.getTime() + 7 * HOUR).toISOString().slice(0, 10);
}

export function daysBetweenIso(later: string, earlier: string): number {
  return Math.round(
    (Date.parse(`${later}T00:00:00Z`) - Date.parse(`${earlier}T00:00:00Z`)) / DAY,
  );
}

/** Baris data dari payload SP2KP: `{data:[...]}` atau `{data:{data:[...]}}`; selain itu kosong. */
export function extractRows(payload: unknown): Array<Record<string, unknown>> {
  if (!payload || typeof payload !== "object") return [];
  const p = payload as { data?: unknown };
  const inner = p.data as { data?: unknown } | null | undefined;
  const arr =
    p.data && typeof p.data === "object" && !Array.isArray(p.data) ? inner?.data : p.data;
  return Array.isArray(arr) ? (arr as Array<Record<string, unknown>>) : [];
}

/** Harga dianggap ada bila minimal satu komoditas punya harga > 0 pada tanggal utama. */
export function hasHargaData(payload: unknown): boolean {
  return extractRows(payload).some((r) => Number(r.harga) > 0);
}

export function hasHetData(payload: unknown): boolean {
  return extractRows(payload).length > 0;
}

/**
 * Berapa lama snapshot dianggap segar.
 * - Ada data & tanggal lama (>3 hari): praktis tetap → 7 hari.
 * - Ada data & tanggal baru: bisa dikoreksi sumber → 6 jam.
 * - Kosong & tanggal baru (≤7 hari): sumber tertinggal beberapa hari, data bisa menyusul → 1 jam.
 * - Kosong & tanggal lama: 24 jam.
 */
export function snapshotTtlMs(opts: { hasData: boolean; tanggal: string; now?: Date }): number {
  const age = daysBetweenIso(todayWib(opts.now), opts.tanggal);
  if (opts.hasData) return age > 3 ? 7 * DAY : 6 * HOUR;
  return age > 7 ? DAY : HOUR;
}

/** Riwayat yang dilayani/ disimpan paling jauh sekian hari ke belakang. */
export const MAX_HISTORY_DAYS = 400;

/** Tanggal valid, tidak di masa depan (WIB), dan tidak lebih tua dari MAX_HISTORY_DAYS. */
export function isDateInWindow(date: string, now: Date = new Date()): boolean {
  if (!isIsoDate(date)) return false;
  const today = todayWib(now);
  return date <= today && daysBetweenIso(today, date) <= MAX_HISTORY_DAYS;
}

/** Selisih hari pembanding yang disimpan ke DB (sama dengan tombol H-1/H-7/H-30 di UI + H-14). */
export const STANDARD_COMPARE_DAYS = [1, 7, 14, 30] as const;

/**
 * Hanya pasangan standar yang disimpan. Pasangan bebas tetap dilayani langsung dari sumber,
 * agar tabel tidak bisa digembungkan oleh kombinasi tanggal sembarang.
 */
export function isStandardPair(tanggal: string, tanggalPembanding: string): boolean {
  return STANDARD_COMPARE_DAYS.some((d) => addDaysIso(tanggal, -d) === tanggalPembanding);
}
