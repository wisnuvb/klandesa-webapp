/** Pemformat nilai untuk isian surat (tanpa dependensi React/Prisma; aman dipakai klien & server). */

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
] as const;
const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"] as const;
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"] as const;
const UNITS = [
  "", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan",
  "sepuluh", "sebelas",
] as const;

export const FORMAT_IDS = [
  "upper", "lower", "title", "angka", "rupiah", "terbilang", "terbilang_rupiah", "tanggal", "hari",
] as const;
export type FormatId = (typeof FORMAT_IDS)[number];

/** Batas aman bilangan bulat JS yang masih tepat; lebih dari ini ditolak (bukan dibulatkan diam-diam). */
export const TERBILANG_MAX = 999_999_999_999_999;

function spell(n: number): string {
  if (n < 12) return UNITS[n];
  if (n < 20) return `${spell(n - 10)} belas`;
  if (n < 100) {
    const rest = n % 10;
    return `${spell(Math.floor(n / 10))} puluh${rest ? ` ${spell(rest)}` : ""}`;
  }
  if (n < 200) return `seratus${n > 100 ? ` ${spell(n - 100)}` : ""}`;
  if (n < 1000) {
    const rest = n % 100;
    return `${spell(Math.floor(n / 100))} ratus${rest ? ` ${spell(rest)}` : ""}`;
  }
  if (n < 2000) return `seribu${n > 1000 ? ` ${spell(n - 1000)}` : ""}`;
  const scales: Array<[number, string]> = [
    [1e12, "triliun"], [1e9, "miliar"], [1e6, "juta"], [1e3, "ribu"],
  ];
  for (const [size, name] of scales) {
    if (n >= size) {
      const head = Math.floor(n / size);
      const rest = n % size;
      return `${spell(head)} ${name}${rest ? ` ${spell(rest)}` : ""}`;
    }
  }
  return "";
}

/** 1500000 → "satu juta lima ratus ribu". Mengembalikan null bila di luar jangkauan. */
export function terbilang(value: number): string | null {
  if (!Number.isFinite(value)) return null;
  const n = Math.trunc(value);
  if (Math.abs(n) > TERBILANG_MAX) return null;
  if (n === 0) return "nol";
  return n < 0 ? `minus ${spell(-n)}` : spell(n);
}

/** Ambil bilangan bulat dari teks seperti "Rp 1.500.000,-" atau "1500000". */
export function parseDigits(raw: string): number | null {
  const m = raw.replace(/,\d{1,2}$/, "").match(/\d[\d.]*/g);
  if (!m) return null;
  const digits = m.join("").replace(/\./g, "");
  if (digits.length === 0 || digits.length > 15) return null;
  const n = Number(digits);
  return Number.isSafeInteger(n) ? n : null;
}

export function formatAngka(n: number): string {
  return Math.trunc(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function romanMonth(month1to12: number): string {
  return ROMAN[month1to12 - 1] ?? "";
}

type DateParts = { y: number; m: number; d: number; dow: number };

function toParts(input: string | Date): DateParts | null {
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return null;
    return { y: input.getFullYear(), m: input.getMonth() + 1, d: input.getDate(), dow: input.getDay() };
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(input.trim());
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dow = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
  return { y, m: mo, d, dow };
}

/** "2026-10-29" atau Date → "29 Oktober 2026" (tidak bergantung locale server). */
export function formatTanggalId(input: string | Date): string | null {
  const p = toParts(input);
  return p ? `${p.d} ${MONTHS[p.m - 1]} ${p.y}` : null;
}

export function formatHariId(input: string | Date): string | null {
  const p = toParts(input);
  return p ? DAYS[p.dow] : null;
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^|[\s\-/'(])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

/** Terapkan format ke nilai teks. Nilai kosong tetap kosong; format yang tak berlaku mengembalikan nilai asli. */
export function applyFormat(value: string, format: FormatId | undefined): string {
  if (!format || value === "") return value;
  switch (format) {
    case "upper": return value.toUpperCase();
    case "lower": return value.toLowerCase();
    case "title": return titleCase(value);
    case "tanggal": return formatTanggalId(value) ?? value;
    case "hari": return formatHariId(value) ?? value;
    case "angka": {
      const n = parseDigits(value);
      return n == null ? value : formatAngka(n);
    }
    case "rupiah": {
      const n = parseDigits(value);
      return n == null ? value : `Rp ${formatAngka(n)}`;
    }
    case "terbilang": {
      const n = parseDigits(value);
      return (n == null ? null : terbilang(n)) ?? value;
    }
    case "terbilang_rupiah": {
      const n = parseDigits(value);
      const t = n == null ? null : terbilang(n);
      return t ? `${t} rupiah` : value;
    }
  }
}
