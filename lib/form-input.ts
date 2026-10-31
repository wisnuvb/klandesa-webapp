/** Pembantu validasi isian formulir yang dipakai bersama beberapa modul administrasi desa. */

export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Teks isian: spasi dirapikan, kosong → null. `bad` bila bukan string, `tooLong` bila melebihi batas. */
export function cleanText(raw: unknown, max: number): { value: string | null; tooLong: boolean; bad: boolean } {
  if (raw === undefined || raw === null) return { value: null, tooLong: false, bad: false };
  if (typeof raw !== "string") return { value: null, tooLong: false, bad: true };
  const v = raw.replace(/\s+/g, " ").trim();
  if (!v) return { value: null, tooLong: false, bad: false };
  return { value: v, tooLong: v.length > max, bad: false };
}

/** Tanggal "YYYY-MM-DD" yang benar-benar ada di kalender, disimpan sebagai tengah malam UTC (kolom DATE). */
export function parseIsoDate(raw: unknown): Date | null {
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const d = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== raw ? null : d;
}

/** Tanggal kolom DATE → "YYYY-MM-DD". */
export const isoDay = (d: Date | null): string | null => (d ? d.toISOString().slice(0, 10) : null);

export type Parsed<T> = { ok: true; value: T } | { ok: false; errors: string[]; fieldErrors: Record<string, string> };
export type Result<T> = { ok: true; data: T } | { ok: false; status: number; errors: string[]; fieldErrors?: Record<string, string> };
export const fail = (status: number, ...errors: string[]): { ok: false; status: number; errors: string[] } => ({ ok: false, status, errors });
export const invalid = (p: { errors: string[]; fieldErrors: Record<string, string> }): { ok: false; status: 400; errors: string[]; fieldErrors: Record<string, string> } => ({ ok: false, status: 400, ...p });

/** Bila tahun dalam tanggal tak sama dengan tahun yang dinyatakan. */
export const future = (d: Date, now: Date): boolean => d.getTime() > now.getTime() + 86_400_000;
