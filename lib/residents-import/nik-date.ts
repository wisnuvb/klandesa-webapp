/** NIK & tanggal: parsing, penurunan data dari NIK, dan deteksi placeholder. */
import { digitsOnly } from "./text";

export type Gender = "Laki-laki" | "Perempuan";

export interface NikInfo {
  /** yyyy-mm-dd, bila bagian tanggal NIK valid. */
  birthDate: string | null;
  gender: Gender | null;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

export function toIsoDate(y: number, m: number, d: number): string | null {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null;
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/** Digit 7-12 NIK = DDMMYY; perempuan: DD + 40. Abad ditentukan dari tahun berjalan. */
export function parseNikInfo(nik: string, now = new Date()): NikInfo {
  if (!/^\d{16}$/.test(nik)) return { birthDate: null, gender: null };
  let day = Number(nik.slice(6, 8));
  const month = Number(nik.slice(8, 10));
  const yy = Number(nik.slice(10, 12));
  let gender: Gender = "Laki-laki";
  if (day > 40) {
    gender = "Perempuan";
    day -= 40;
  }
  const curYY = now.getFullYear() % 100;
  const year = yy <= curYY ? 2000 + yy : 1900 + yy;
  const birthDate = toIsoDate(year, month, day);
  return birthDate ? { birthDate, gender } : { birthDate: null, gender: null };
}

export interface NikParse {
  nik: string;
  /** Sel numerik dengan 15+ digit berakhiran 0: hampir pasti dipotong Excel (presisi 15 digit). */
  truncatedSuspect: boolean;
}

/** Ubah isi sel (string/angka) menjadi digit NIK/KK utuh tanpa notasi ilmiah. */
export function parseLongNumber(raw: unknown): NikParse {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const s = raw.toLocaleString("fullwide", { useGrouping: false, maximumFractionDigits: 0 });
    const d = digitsOnly(s);
    return { nik: d, truncatedSuspect: d.length >= 15 && d.endsWith("0") };
  }
  const s = String(raw ?? "").trim();
  // Notasi ilmiah dari teks, mis. "3.50807E+15"
  if (/^\d+([.,]\d+)?e\+?\d+$/i.test(s)) {
    const n = Number(s.replace(",", "."));
    if (Number.isFinite(n)) return parseLongNumber(n);
  }
  return { nik: digitsOnly(s), truncatedSuspect: false };
}

const PLACEHOLDER_DATES = new Set(["1970-01-01", "1900-01-01", "1899-12-30", "1900-01-00", "0001-01-01"]);

export function isPlaceholderDate(iso: string): boolean {
  return PLACEHOLDER_DATES.has(iso);
}

const MONTHS: Record<string, number> = {
  januari: 1, jan: 1, january: 1,
  februari: 2, feb: 2, pebruari: 2, february: 2,
  maret: 3, mar: 3, march: 3,
  april: 4, apr: 4,
  mei: 5, may: 5,
  juni: 6, jun: 6, june: 6,
  juli: 7, jul: 7, july: 7,
  agustus: 8, agu: 8, ags: 8, agt: 8, aug: 8, august: 8,
  september: 9, sep: 9, sept: 9,
  oktober: 10, okt: 10, oct: 10, october: 10,
  november: 11, nov: 11, nopember: 11,
  desember: 12, des: 12, dec: 12, december: 12,
};

function expandYear(y: number, now: Date): number {
  if (y >= 100) return y;
  return y <= now.getFullYear() % 100 ? 2000 + y : 1900 + y;
}

/** Serial tanggal Excel → yyyy-mm-dd (UTC, bebas zona waktu). */
export function excelSerialToIso(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 1 || serial > 80000) return null;
  const ms = Date.UTC(1899, 11, 30) + Math.floor(serial) * 86_400_000;
  const d = new Date(ms);
  return toIsoDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/**
 * Parse tanggal bergaya Indonesia (hari dulu). Mendukung ISO, dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy,
 * "1 Januari 1959", "01 JAN 59", serial Excel, dan teks "LUMAJANG, 01-01-1959".
 * Mengembalikan null bila tak bisa dipastikan (tidak pernah menebak hari ini).
 */
export function parseDateLoose(raw: unknown, now = new Date()): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return null;
    return toIsoDate(raw.getFullYear(), raw.getMonth() + 1, raw.getDate());
  }
  if (typeof raw === "number") return excelSerialToIso(raw);

  const s = String(raw).trim().replace(/^'+/, "");
  if (!s) return null;

  let m = s.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?!\d)/);
  if (m) return toIsoDate(Number(m[1]), Number(m[2]), Number(m[3]));

  m = s.match(/(?<!\d)(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})(?!\d)/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    // Hari dulu (konvensi Indonesia). Bila bagian pertama mustahil jadi hari dan kedua bisa, tukar.
    let d = a;
    let mo = b;
    if (a > 31 && b <= 31) return null;
    if (mo > 12 && d <= 12) [d, mo] = [mo, d];
    return toIsoDate(expandYear(Number(m[3]), now), mo, d);
  }

  m = s.match(/(?<!\d)(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{4}|\d{2})(?!\d)/);
  if (m) {
    const mo = MONTHS[m[2].toLowerCase()];
    if (mo) return toIsoDate(expandYear(Number(m[3]), now), mo, Number(m[1]));
  }

  // Serial Excel yang terbaca sebagai teks angka
  if (/^\d{4,5}$/.test(s)) return excelSerialToIso(Number(s));

  return null;
}

/** Pisahkan "LUMAJANG, 01-01-1959" / "Lumajang 1 Januari 1959" menjadi tempat dan tanggal. */
export function splitBirthPlaceDate(raw: unknown, now = new Date()): { place: string; date: string | null } {
  const s = String(raw ?? "").trim();
  if (!s) return { place: "", date: null };
  const m = s.match(/^(.*?)[\s,;/]*(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}\s+[A-Za-z]+\.?\s+\d{2,4})\s*$/);
  if (!m) return { place: s.replace(/[,;]+$/, "").trim(), date: null };
  return { place: m[1].replace(/[,;\s]+$/, "").trim(), date: parseDateLoose(m[2], now) };
}
