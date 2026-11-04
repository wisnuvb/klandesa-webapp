/**
 * Daftar Kartu Keluarga (/data-kk): aturan murni, tanpa DB. Dipakai rute API (penyamaran, lencana, parameter) dan halaman.
 * Semua angka per KK berasal dari SATU agregasi `GROUP BY kk` di server (lihat kk-list-service.ts); modul ini hanya
 * menafsirkan hasilnya. Hanya anggota AKTIF (hidup dan belum pindah) yang dihitung.
 */

/** Batas usia kelompok (tahun, bulat). Dewasa = 17 sama dengan daftar kerja KK (worklist.ts). */
export const KK_AGE = { balitaUnder: 5, lansiaFrom: 60, dewasaFrom: 17 } as const;

export const KK_PAGE_SIZE_MAX = 100;

export type KkPreset = "perhatian" | "lansia_sendiri" | "tanpa_dewasa";
export const KK_PRESETS: readonly KkPreset[] = ["perhatian", "lansia_sendiri", "tanpa_dewasa"];
export const KK_PRESET_LABEL: Record<KkPreset, string> = {
  perhatian: "Perlu perhatian",
  lansia_sendiri: "Lansia tinggal sendiri",
  tanpa_dewasa: "Tanpa anggota dewasa",
};

export type KkHas = "balita" | "lansia" | "hamil" | "disabilitas" | "stunting";
export const KK_HAS: readonly KkHas[] = ["balita", "lansia", "hamil", "disabilitas", "stunting"];
export const KK_HAS_LABEL: Record<KkHas, string> = {
  balita: "Ada balita",
  lansia: "Ada lansia",
  hamil: "Ada ibu hamil",
  disabilitas: "Ada penyandang disabilitas",
  stunting: "Ada anak stunting",
};

export type KkSize = "1" | "2-4" | "5+";
export const KK_SIZES: readonly KkSize[] = ["1", "2-4", "5+"];
export const KK_SIZE_LABEL: Record<KkSize, string> = { "1": "1 orang", "2-4": "2–4 orang", "5+": "5 orang atau lebih" };

export type KkSortKey = "family_card_number" | "kepalaKeluarga" | "alamat" | "rt_rw" | "hamlet" | "jumlahAnggota";
export const KK_SORT_KEYS: readonly KkSortKey[] = ["family_card_number", "kepalaKeluarga", "alamat", "rt_rw", "hamlet", "jumlahAnggota"];

/** Parameter daftar yang sudah dibersihkan. Nilai di luar daftar putih dibuang, bukan ditolak. */
export interface KkQuery {
  page: number;
  pageSize: number;
  sortKey: KkSortKey;
  sortOrder: "asc" | "desc";
  search: string;
  dusun: string;
  rw: string;
  rt: string;
  size: KkSize | null;
  has: KkHas | null;
  preset: KkPreset | null;
  /** Minta nomor KK/NIK lengkap; hanya dipenuhi bila pemanggil punya izin (diputuskan rute, bukan di sini). */
  full: boolean;
}

const oneOf = <T extends string>(list: readonly T[], v: string | null): T | null => (v && (list as readonly string[]).includes(v) ? (v as T) : null);
const text = (v: string | null, max: number) => (v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const posInt = (v: string | null, fallback: number) => {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export function parseKkQuery(sp: URLSearchParams): KkQuery {
  return {
    page: posInt(sp.get("page"), 1),
    pageSize: Math.min(KK_PAGE_SIZE_MAX, posInt(sp.get("pageSize"), 10)),
    sortKey: oneOf(KK_SORT_KEYS, sp.get("sortKey")) ?? "family_card_number",
    sortOrder: sp.get("sortOrder") === "desc" ? "desc" : "asc",
    search: text(sp.get("search"), 100),
    dusun: text(sp.get("dusun"), 100),
    rw: text(sp.get("rw"), 10),
    rt: text(sp.get("rt"), 10),
    size: oneOf(KK_SIZES, sp.get("size")),
    has: oneOf(KK_HAS, sp.get("has")),
    preset: oneOf(KK_PRESETS, sp.get("preset")),
    full: sp.get("full") === "1",
  };
}

/** "01" dan "1" satu unit wilayah (sama dengan kunci kanonik WilayahUnit). Kosong tetap kosong. */
export const normalizeUnit = (v: string | null | undefined): string => {
  const t = (v ?? "").trim();
  if (!t || t === "-") return "";
  const stripped = t.replace(/^0+/, "");
  return stripped === "" ? "0" : stripped;
};

/** Satu baris hasil agregasi per KK (angka sudah Number, bukan BigInt). */
export interface KkAggRow {
  kk: string;
  /** Id salah satu anggota (terkecil): pegangan buram untuk membuka detail tanpa mengirim nomor KK. */
  ref: number;
  activeCount: number;
  inactiveCount: number;
  /** Jumlah kepala keluarga di antara anggota aktif. */
  headCount: number;
  /** Anggota aktif yang NIK-nya bukan 16 angka. */
  badNik: number;
  balita: number;
  lansia: number;
  dewasa: number;
  hamil: number;
  disabilitas: number;
  stunting: number;
  headName: string;
  address: string;
  rt: string;
  rw: string;
  hamlet: string;
}

export type KkFlag = "NO_HEAD" | "MULTIPLE_HEADS" | "BAD_NIK" | "NO_ACTIVE";

export const KK_FLAG_META: Record<KkFlag, { label: string; help: string; attention: boolean }> = {
  NO_HEAD: { label: "Tanpa kepala keluarga", help: "Tidak ada anggota aktif yang berperan Kepala Keluarga.", attention: true },
  MULTIPLE_HEADS: { label: "Kepala keluarga lebih dari satu", help: "Lebih dari satu anggota aktif berperan Kepala Keluarga.", attention: true },
  BAD_NIK: { label: "NIK perlu dicek", help: "Ada anggota aktif yang NIK-nya bukan 16 angka.", attention: true },
  NO_ACTIVE: { label: "Tanpa anggota aktif", help: "Semua anggota tercatat meninggal atau pindah.", attention: false },
};

const FLAG_ORDER: readonly KkFlag[] = ["NO_HEAD", "MULTIPLE_HEADS", "BAD_NIK", "NO_ACTIVE"];

/**
 * Masalah data per KK. HARUS sama dengan syarat SQL preset "perhatian" di kk-list-service.ts (dijaga tes integrasi).
 * KK tanpa anggota aktif tidak dianggap "tanpa kepala": tidak ada orang yang perlu kepala.
 */
export function kkFlags(r: Pick<KkAggRow, "activeCount" | "headCount" | "badNik">): KkFlag[] {
  const out: KkFlag[] = [];
  if (r.activeCount === 0) out.push("NO_ACTIVE");
  else {
    if (r.headCount === 0) out.push("NO_HEAD");
    if (r.headCount > 1) out.push("MULTIPLE_HEADS");
  }
  if (r.badNik > 0) out.push("BAD_NIK");
  return FLAG_ORDER.filter((f) => out.includes(f));
}

export const needsAttention = (flags: readonly KkFlag[]): boolean => flags.some((f) => KK_FLAG_META[f].attention);

/** Lansia sendirian: satu anggota aktif dan ia lansia. */
export const isElderAlone = (r: Pick<KkAggRow, "activeCount" | "lansia">): boolean => r.activeCount === 1 && r.lansia === 1;
/** Ada orang aktif tetapi tak seorang pun dewasa (anak-anak tinggal sendiri/dengan anak lain). */
export const hasNoAdult = (r: Pick<KkAggRow, "activeCount" | "dewasa">): boolean => r.activeCount > 0 && r.dewasa === 0;

/** Samarkan nomor panjang (KK/NIK): hanya 4 angka terakhir yang terlihat. Tidak pernah mengembalikan nilai asli. */
export function maskDigits(v: string | null | undefined): string {
  const s = String(v ?? "").replace(/\s+/g, "");
  if (!s) return "";
  return `•••• •••• •••• ${s.slice(-4)}`;
}

/** Nomor lengkap dengan spasi tiap 4 angka, untuk tampilan admin. */
export const spacedDigits = (v: string): string => v.replace(/(\d{4})(?=\d)/g, "$1 ").trim();

export interface KkListRow {
  /** Pegangan buram (id anggota). Dipakai untuk membuka detail dan Pecah KK. */
  ref: number;
  /** Tersamar bila `kk` null. */
  kkMasked: string;
  /** Nomor KK lengkap: HANYA ada bila pemanggil boleh melihat penuh dan memintanya. */
  kk: string | null;
  kepalaKeluarga: string;
  alamat: string;
  rt: string;
  rw: string;
  hamlet: string;
  jumlahAnggota: number;
  tidakAktif: number;
  flags: KkFlag[];
  perhatian: boolean;
  komposisi: { balita: number; lansia: number; hamil: number; disabilitas: number; stunting: number };
}

export function toKkListRow(r: KkAggRow, opts: { full: boolean }): KkListRow {
  const flags = kkFlags(r);
  return {
    ref: r.ref,
    kkMasked: maskDigits(r.kk),
    kk: opts.full ? r.kk : null,
    kepalaKeluarga: r.headName || "-",
    alamat: r.address || "-",
    rt: r.rt || "-",
    rw: r.rw || "-",
    hamlet: r.hamlet || "-",
    jumlahAnggota: r.activeCount,
    tidakAktif: r.inactiveCount,
    flags,
    perhatian: needsAttention(flags),
    komposisi: { balita: r.balita, lansia: r.lansia, hamil: r.hamil, disabilitas: r.disabilitas, stunting: r.stunting },
  };
}

export interface KkSummary {
  totalKk: number;
  totalJiwa: number;
  rataRataAnggota: number;
  perhatian: number;
  lansiaSendiri: number;
  tanpaDewasa: number;
  /** Pilihan dropdown wilayah: nilai yang sungguh ada di data desa. */
  wilayah: { dusun: string[]; rw: string[]; rt: string[] };
}

/** Urutan alami untuk "1", "2", "10" (bukan "1", "10", "2"). */
export const compareUnits = (a: string, b: string): number => a.length - b.length || a.localeCompare(b, "id");

/**
 * Pegangan ke KK di jalur API: id anggota (1–12 angka) atau nomor KK apa adanya (rute lama tetap bekerja, termasuk KK
 * lama yang bukan 16 angka). Nomor KK sah selalu 16 angka, jadi tidak bisa tertukar dengan id anggota.
 */
export type KkKey = { type: "ref"; id: number } | { type: "kk"; kk: string };
export function parseKkKey(raw: string): KkKey | null {
  if (/^\d{1,12}$/.test(raw)) {
    const id = Number(raw);
    return id > 0 ? { type: "ref", id } : null;
  }
  return raw ? { type: "kk", kk: raw } : null;
}
