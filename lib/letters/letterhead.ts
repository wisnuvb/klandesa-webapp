/**
 * Gaya kop surat desa (posisi logo, garis bawah, ukuran logo). Murni — tanpa DB/React — supaya
 * dipakai bersama oleh renderer kertas, API, dan panel editor.
 *
 * Disimpan per DESA di `Village.settings.letterhead` (bukan per jenis surat): kop sebuah desa
 * seragam di semua suratnya, jadi operator mengaturnya sekali. Tidak perlu migrasi basis data.
 */

export const LETTERHEAD_LAYOUTS = ["kiri", "atas", "kanan"] as const;
export const LETTERHEAD_RULES = ["ganda", "tunggal", "tanpa"] as const;
export const LETTERHEAD_LOGO_SIZES = ["kecil", "sedang", "besar"] as const;

export type LetterheadLayout = (typeof LETTERHEAD_LAYOUTS)[number];
export type LetterheadRule = (typeof LETTERHEAD_RULES)[number];
export type LetterheadLogoSize = (typeof LETTERHEAD_LOGO_SIZES)[number];

export type LetterheadStyle = {
  layout: LetterheadLayout;
  rule: LetterheadRule;
  logoSize: LetterheadLogoSize;
};

export const DEFAULT_LETTERHEAD_STYLE: LetterheadStyle = { layout: "kiri", rule: "ganda", logoSize: "sedang" };

/** Tinggi/lebar logo (mm) per ukuran; logo "atas" sedikit dikecilkan agar kop tidak memakan halaman. */
export const LOGO_SIZE_MM: Record<LetterheadLogoSize, number> = { kecil: 18, sedang: 22, besar: 28 };

export const LETTERHEAD_LAYOUT_LABELS: Record<LetterheadLayout, { label: string; hint: string }> = {
  kiri: { label: "Logo di kiri", hint: "Paling umum; teks di tengah." },
  atas: { label: "Logo di atas", hint: "Logo di tengah, teks di bawahnya." },
  kanan: { label: "Logo di kanan", hint: "Teks di tengah, logo di sisi kanan." },
};

export const LETTERHEAD_RULE_LABELS: Record<LetterheadRule, string> = {
  ganda: "Garis ganda",
  tunggal: "Garis tunggal",
  tanpa: "Tanpa garis",
};

export const LETTERHEAD_LOGO_SIZE_LABELS: Record<LetterheadLogoSize, string> = {
  kecil: "Kecil",
  sedang: "Sedang",
  besar: "Besar",
};

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

function pick<T extends string>(allowed: readonly T[], v: unknown, fallback: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

/** Normalisasi nilai apa pun (dari JSON/klien) menjadi gaya kop yang sah. Tidak pernah melempar. */
export function normalizeLetterheadStyle(raw: unknown): LetterheadStyle {
  const o = isObj(raw) ? raw : {};
  return {
    layout: pick(LETTERHEAD_LAYOUTS, o.layout, DEFAULT_LETTERHEAD_STYLE.layout),
    rule: pick(LETTERHEAD_RULES, o.rule, DEFAULT_LETTERHEAD_STYLE.rule),
    logoSize: pick(LETTERHEAD_LOGO_SIZES, o.logoSize, DEFAULT_LETTERHEAD_STYLE.logoSize),
  };
}

/** Baca gaya kop dari `Village.settings`. */
export function parseLetterheadStyle(settings: unknown): LetterheadStyle {
  return normalizeLetterheadStyle(isObj(settings) ? settings.letterhead : undefined);
}

/** Tulis gaya kop ke `Village.settings` tanpa menghapus kunci lain. */
export function mergeLetterheadStyleIntoSettings(existing: unknown, style: Partial<LetterheadStyle>): Record<string, unknown> {
  const base = isObj(existing) ? { ...existing } : {};
  return { ...base, letterhead: normalizeLetterheadStyle({ ...parseLetterheadStyle(existing), ...style }) };
}
