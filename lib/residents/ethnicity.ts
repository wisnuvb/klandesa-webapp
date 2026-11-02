/**
 * Suku/etnis warga. Murni (aman dipakai di klien dan server).
 * Daftar ini hanya saran baku supaya ejaan seragam untuk statistik; nilai di luar daftar tetap boleh disimpan.
 */

export const ETHNICITIES = [
  "Aceh", "Ambon", "Arab", "Bali", "Banjar", "Banten", "Batak", "Betawi", "Bima", "Bugis",
  "Cirebon", "Dayak", "Flores", "Gayo", "Gorontalo", "India", "Jawa", "Komering", "Lampung", "Madura",
  "Makassar", "Mandar", "Melayu", "Minahasa", "Minangkabau", "Nias", "Osing", "Palembang", "Papua", "Rejang",
  "Sasak", "Sumba", "Sumbawa", "Sunda", "Tengger", "Timor", "Tionghoa", "Toraja",
] as const;

/** Penulisan lain yang sering muncul di berkas Excel desa → bentuk baku. Kunci sudah huruf kecil. */
const ALIASES: Record<string, string> = {
  china: "Tionghoa",
  cina: "Tionghoa",
  chinese: "Tionghoa",
  using: "Osing",
  minang: "Minangkabau",
  jowo: "Jawa",
};

export const ETHNICITY_MAX_LENGTH = 100;

const BY_KEY = new Map<string, string>(ETHNICITIES.map((e) => [e.toLowerCase(), e]));

const titleCase = (s: string) => s.replace(/\p{L}[\p{L}'’-]*/gu, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());

/**
 * Rapikan isian suku: buang awalan "suku", samakan huruf besar-kecil dengan daftar baku, dan petakan sinonim.
 * Teks di luar daftar dipertahankan dengan huruf awal kapital. Kosong/penanda kosong → null.
 */
export function normalizeEthnicity(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let s = raw.replace(/\s+/g, " ").trim();
  s = s.replace(/^suku\s+/i, "").trim();
  if (!s || /^[-–—.?]+$/.test(s) || /^(tidak (ada|tahu|diketahui)|n\/?a|null)$/i.test(s)) return null;
  const key = s.toLowerCase();
  return BY_KEY.get(key) ?? ALIASES[key] ?? titleCase(s);
}

export const isKnownEthnicity = (v: string | null | undefined): boolean => !!v && BY_KEY.has(v.toLowerCase());
