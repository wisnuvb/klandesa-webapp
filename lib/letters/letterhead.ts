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

/** Cara alamat & kontak ditata: mengalir satu paragraf, alamat lalu kontak di baris baru, atau satu item per baris. */
export const LETTERHEAD_ADDRESS_LAYOUTS = ["alir", "dua", "per"] as const;
export type LetterheadAddressLayout = (typeof LETTERHEAD_ADDRESS_LAYOUTS)[number];

/** Tiga kelompok baris kop yang ukuran hurufnya bisa diatur (pt). */
export const LETTERHEAD_FONT_KEYS = ["instansi", "desa", "alamat"] as const;
export type LetterheadFontKey = (typeof LETTERHEAD_FONT_KEYS)[number];
export type LetterheadFontSizes = Record<LetterheadFontKey, number>;

/** Tiga baris judul kop yang teksnya boleh diganti; kosong = otomatis dari data wilayah desa. */
export const LETTERHEAD_NAME_KEYS = ["pemerintah", "kecamatan", "desa"] as const;
export type LetterheadNameKey = (typeof LETTERHEAD_NAME_KEYS)[number];
export type LetterheadNames = Record<LetterheadNameKey, string>;

export const FONT_SIZE_RANGE = { min: 8, max: 24, step: 0.5 } as const;
export const NAME_MAX_LENGTH = 120;

export type LetterheadStyle = {
  layout: LetterheadLayout;
  rule: LetterheadRule;
  logoSize: LetterheadLogoSize;
  /** Ukuran huruf (pt) untuk baris Pemerintah/Kecamatan, nama Desa, dan alamat & kontak. */
  fontSizes: LetterheadFontSizes;
  addressLayout: LetterheadAddressLayout;
  /** Teks pengganti baris judul kop. */
  names: LetterheadNames;
};

/** Bawaan ukuran huruf = tampilan sebelum ukuran bisa diatur (1,1 / 1,3 / 0,85 em dari huruf isi 12 pt). */
export const DEFAULT_FONT_SIZES: LetterheadFontSizes = { instansi: 13, desa: 16, alamat: 10 };
export const DEFAULT_NAMES: LetterheadNames = { pemerintah: "", kecamatan: "", desa: "" };

export const DEFAULT_LETTERHEAD_STYLE: LetterheadStyle = {
  layout: "kiri",
  rule: "ganda",
  logoSize: "sedang",
  fontSizes: DEFAULT_FONT_SIZES,
  addressLayout: "alir",
  names: DEFAULT_NAMES,
};

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

export const LETTERHEAD_ADDRESS_LAYOUT_LABELS: Record<LetterheadAddressLayout, { label: string; hint: string }> = {
  alir: { label: "Mengalir", hint: "Alamat dan kontak berurutan dalam satu paragraf." },
  dua: { label: "Alamat, lalu kontak", hint: "Alamat dan kode pos di baris pertama; telepon dan email di baris berikutnya." },
  per: { label: "Satu per baris", hint: "Alamat, kode pos, telepon, dan email masing-masing di baris sendiri." },
};

export const LETTERHEAD_FONT_LABELS: Record<LetterheadFontKey, { label: string; hint: string }> = {
  instansi: { label: "Pemerintah & kecamatan", hint: "Baris PEMERINTAH KABUPATEN… dan KECAMATAN…" },
  desa: { label: "Nama desa", hint: "Baris DESA…" },
  alamat: { label: "Alamat & kontak", hint: "Alamat kantor, telepon, email, kode pos." },
};

export const LETTERHEAD_NAME_LABELS: Record<LetterheadNameKey, string> = {
  pemerintah: "Baris pemerintah",
  kecamatan: "Baris kecamatan",
  desa: "Baris desa",
};

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const CONTROL = /[\u0000-\u001F\u007F]/g;

function pick<T extends string>(allowed: readonly T[], v: unknown, fallback: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

function pickSize(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v.replace(",", ".")) : NaN;
  if (!Number.isFinite(n)) return fallback;
  const { min, max, step } = FONT_SIZE_RANGE;
  return Math.min(max, Math.max(min, Math.round(n / step) * step));
}

function pickName(v: unknown): string {
  return typeof v === "string" ? v.replace(CONTROL, " ").replace(/\s+/g, " ").trim().slice(0, NAME_MAX_LENGTH) : "";
}

/** Normalisasi nilai apa pun (dari JSON/klien) menjadi gaya kop yang sah. Tidak pernah melempar. */
export function normalizeLetterheadStyle(raw: unknown): LetterheadStyle {
  const o = isObj(raw) ? raw : {};
  const fs = isObj(o.fontSizes) ? o.fontSizes : {};
  const nm = isObj(o.names) ? o.names : {};
  return {
    layout: pick(LETTERHEAD_LAYOUTS, o.layout, DEFAULT_LETTERHEAD_STYLE.layout),
    rule: pick(LETTERHEAD_RULES, o.rule, DEFAULT_LETTERHEAD_STYLE.rule),
    logoSize: pick(LETTERHEAD_LOGO_SIZES, o.logoSize, DEFAULT_LETTERHEAD_STYLE.logoSize),
    fontSizes: {
      instansi: pickSize(fs.instansi, DEFAULT_FONT_SIZES.instansi),
      desa: pickSize(fs.desa, DEFAULT_FONT_SIZES.desa),
      alamat: pickSize(fs.alamat, DEFAULT_FONT_SIZES.alamat),
    },
    addressLayout: pick(LETTERHEAD_ADDRESS_LAYOUTS, o.addressLayout, DEFAULT_LETTERHEAD_STYLE.addressLayout),
    names: { pemerintah: pickName(nm.pemerintah), kecamatan: pickName(nm.kecamatan), desa: pickName(nm.desa) },
  };
}

/** Baca gaya kop dari `Village.settings`. */
export function parseLetterheadStyle(settings: unknown): LetterheadStyle {
  return normalizeLetterheadStyle(isObj(settings) ? settings.letterhead : undefined);
}

/** Gabung perubahan sebagian ke gaya lama (kelompok bertingkat digabung per kunci, bukan ditimpa utuh). */
export function patchLetterheadStyle(base: LetterheadStyle, patch: LetterheadStylePatch): LetterheadStyle {
  return normalizeLetterheadStyle({
    ...base,
    ...patch,
    fontSizes: { ...base.fontSizes, ...patch.fontSizes },
    names: { ...base.names, ...patch.names },
  });
}

export type LetterheadStylePatch = Partial<Omit<LetterheadStyle, "fontSizes" | "names">> & {
  fontSizes?: Partial<LetterheadFontSizes>;
  names?: Partial<LetterheadNames>;
};

/** Tulis gaya kop ke `Village.settings` tanpa menghapus kunci lain. */
export function mergeLetterheadStyleIntoSettings(existing: unknown, style: LetterheadStylePatch): Record<string, unknown> {
  const base = isObj(existing) ? { ...existing } : {};
  return { ...base, letterhead: patchLetterheadStyle(parseLetterheadStyle(existing), style) };
}

export function sameLetterheadStyle(a: LetterheadStyle, b: LetterheadStyle): boolean {
  return JSON.stringify(normalizeLetterheadStyle(a)) === JSON.stringify(normalizeLetterheadStyle(b));
}

// ------------------------------------------------------------------ teks kop

type Regency = { jenis: string; nama: string };

const PREFIXES = {
  kecamatan: /^(?:kecamatan|kec\.?)\s+/i,
  desa: /^(?:desa|ds\.?)\s+/i,
} as const;

/**
 * Pisahkan jenis & nama wilayah tingkat kabupaten/kota. "Kab. Kutai Kartanegara", "Kabupaten Kutai Kartanegara"
 * dan "Kutai Kartanegara" sama-sama jadi KABUPATEN + "Kutai Kartanegara" (tidak ada "Kab." ganda di kop);
 * "Kota Balikpapan" jadi KOTA + "Balikpapan".
 */
export function parseRegency(raw: string | undefined): Regency {
  const s = (raw ?? "").trim();
  const m = s.match(/^(kabupaten|kab\.?|kota\s+administrasi|kota\s+adm\.?|kota)\s+(.+)$/i);
  if (!m) return { jenis: "KABUPATEN", nama: s };
  const k = m[1].toLowerCase().replace(/\s+/g, " ");
  const jenis = k.startsWith("kab") ? "KABUPATEN" : k.startsWith("kota adm") ? "KOTA ADMINISTRASI" : "KOTA";
  return { jenis, nama: m[2].trim() };
}

const stripName = (s: string | undefined, key: keyof typeof PREFIXES) => (s ?? "").trim().replace(PREFIXES[key], "").trim();

export type KopHeadingLine = { text: string; role: LetterheadFontKey };

/** Baris judul kop (huruf kapital). Teks pengganti di `style.names` menggantikan baris otomatisnya. */
export function kopHeadingLines(desa: Record<string, string | undefined>, names: LetterheadNames): KopHeadingLine[] {
  const reg = parseRegency(desa.kabupaten);
  const kec = stripName(desa.kecamatan, "kecamatan");
  const nama = stripName(desa.nama, "desa");
  const lines: Array<KopHeadingLine | null> = [
    { text: names.pemerintah || (reg.nama ? `PEMERINTAH ${reg.jenis} ${reg.nama}` : ""), role: "instansi" },
    { text: names.kecamatan || (kec ? `KECAMATAN ${kec}` : ""), role: "instansi" },
    { text: names.desa || (nama ? `DESA ${nama}` : ""), role: "desa" },
  ];
  return lines.filter((l): l is KopHeadingLine => !!l && l.text !== "").map((l) => ({ ...l, text: l.text.toUpperCase() }));
}

/** Satu potongan alamat. `keep` = jangan dipatahkan di tengah (telepon, email, kode pos), agar baris baru hanya muncul di antara potongan. */
export type KopSegment = { text: string; keep: boolean };

/** Alamat & kontak per baris sesuai `addressLayout`. Bagian yang kosong dilewati. */
export function kopAddressLines(desa: Record<string, string | undefined>, layout: LetterheadAddressLayout): KopSegment[][] {
  const t = (v: string | undefined) => (v ?? "").trim();
  const alamat = t(desa.alamat);
  const pos = t(desa.kode_pos);
  const tel = t(desa.telepon);
  const mail = t(desa.email);
  const A: KopSegment | null = alamat ? { text: alamat, keep: false } : null;
  const P: KopSegment | null = pos ? { text: `Kode Pos ${pos}`, keep: true } : null;
  const T: KopSegment | null = tel ? { text: `Telp. ${tel}`, keep: true } : null;
  const E: KopSegment | null = mail ? { text: `Email: ${mail}`, keep: true } : null;
  const compact = (xs: Array<KopSegment | null>) => xs.filter((x): x is KopSegment => !!x);
  const lines =
    layout === "per"
      ? [[A], [P], [T], [E]]
      : layout === "dua"
        ? [[A, P], [T, E]]
        : [[A, T, E, P]];
  return lines.map(compact).filter((l) => l.length > 0);
}
