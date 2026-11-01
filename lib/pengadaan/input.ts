/** Pembantu validasi isian bersama modul pengadaan, kerja sama desa, dan IDM (murni, ketat). */
import { cleanText, parseIsoDate } from "@/lib/form-input";
import { toCents } from "@/lib/coop/loan-math";

export const has = (b: Record<string, unknown>, k: string): boolean => Object.prototype.hasOwnProperty.call(b, k);
export const blank = (v: unknown): boolean => v === undefined || v === null || v === "";
export const MAX_CENTS = 99_999_999_999_999n;

export function money(v: unknown): { value: bigint | null; bad: boolean } {
  if (blank(v)) return { value: null, bad: false };
  const c = typeof v === "string" || typeof v === "number" ? toCents(v) : null;
  return c === null || c > MAX_CENTS ? { value: null, bad: true } : { value: c, bad: false };
}

/** Bilangan bulat dari angka atau string digit saja (menolak "1e3", "0x10", array, boolean). */
export const digits = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && /^\d{1,10}$/.test(v.trim()) ? Number(v) : NaN;
  return Number.isInteger(n) ? n : null;
};
export const posInt = (v: unknown): number | null => {
  const n = digits(v);
  return n !== null && n >= 1 && n <= 2_000_000_000 ? n : null;
};

/** Tanggal wajar (tahun 2000-2100). */
export const sane = (d: Date | null): Date | null => (d && d.getUTCFullYear() >= 2000 && d.getUTCFullYear() <= 2100 ? d : null);

export function yearOf(body: Record<string, unknown>, fe: Record<string, string>): number {
  const y = digits(body.year) ?? NaN;
  if (!Number.isInteger(y) || y < 2000 || y > 2100) fe.year = "Isi tahun antara 2000 dan 2100.";
  return y;
}

export function optText(body: Record<string, unknown>, k: string, max: number, label: string, fe: Record<string, string>): string | null {
  const t = cleanText(body[k], max);
  if (t.bad || t.tooLong) fe[k] = `${label} maksimal ${max} karakter.`;
  return t.value;
}
export function reqText(body: Record<string, unknown>, k: string, max: number, label: string, fe: Record<string, string>): string {
  const t = cleanText(body[k], max);
  if (t.bad || t.tooLong || !t.value) {
    fe[k] = `${label} wajib diisi (maks. ${max} karakter).`;
    return "";
  }
  return t.value;
}
/** Teks panjang bebas (alinea): spasi baris dipertahankan, tetapi dibatasi panjangnya. */
export function longText(body: Record<string, unknown>, k: string, max: number, label: string, fe: Record<string, string>): string | null {
  const v = body[k];
  if (v === undefined || v === null) return null;
  if (typeof v !== "string") {
    fe[k] = `${label} tidak valid.`;
    return null;
  }
  const t = v.replace(/\r\n/g, "\n").trim();
  if (!t) return null;
  if (t.length > max) {
    fe[k] = `${label} maksimal ${max} karakter.`;
    return null;
  }
  return t;
}
/** Tanggal opsional: kosong -> null; salah -> galat. */
export function optDate(body: Record<string, unknown>, k: string, label: string, fe: Record<string, string>): Date | null {
  if (blank(body[k])) return null;
  const d = sane(parseIsoDate(body[k]));
  if (!d) fe[k] = `${label} tidak valid.`;
  return d;
}
export function reqDate(body: Record<string, unknown>, k: string, label: string, fe: Record<string, string>): Date {
  const d = sane(parseIsoDate(body[k]));
  if (!d) fe[k] = `Isi ${label.toLowerCase()} yang valid.`;
  return d ?? new Date(0);
}
export function optMoney(body: Record<string, unknown>, k: string, label: string, fe: Record<string, string>): bigint | null {
  const m = money(body[k]);
  if (m.bad || (m.value !== null && m.value <= 0n)) fe[k] = `${label} harus angka rupiah lebih dari nol.`;
  return m.value;
}
export const bad = (fe: Record<string, string>) => ({ ok: false as const, errors: Object.values(fe), fieldErrors: fe });
export const notRecord = () => ({ ok: false as const, errors: ["Data tidak valid."], fieldErrors: {} as Record<string, string> });
