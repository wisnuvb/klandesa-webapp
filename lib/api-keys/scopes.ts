/**
 * Daftar scope kunci API. Setiap scope memberi akses ke satu kelompok data desa; kunci selalu dimulai dari baca-saja
 * (tangga kepercayaan 1: PII tersamar). Menambah scope baru = menambah baris di sini lalu endpoint /api/v1 yang memakainya.
 */
export const API_SCOPES = {
  "kependudukan:read": {
    label: "Data penduduk, keluarga, dan wilayah",
    detail: "Nama terlihat. NIK dan nomor KK disamarkan (hanya 4 digit terakhir). Tanpa alamat, telepon, tanggal lahir lengkap, dan data kesehatan.",
    sensitive: true,
  },
  "perangkat:read": { label: "Perangkat dan jabatan desa", detail: "Nama, jabatan, dan masa jabatan. Tanpa NIK, telepon, email, atau alamat.", sensitive: false },
  "pengumuman:read": { label: "Pengumuman desa", detail: "Pengumuman yang sedang tayang.", sensitive: false },
  "statistik:read": { label: "Statistik ringkas desa", detail: "Angka agregat, tanpa data pribadi.", sensitive: false },
  "potensi:read": { label: "Potensi dan UMKM desa", detail: "Potensi desa dan UMKM yang aktif. Tanpa nilai pendapatan.", sensitive: false },
  "data-kustom:read": {
    label: "Data kustom buatan desa",
    detail: "Hanya kolom yang ditandai bukan data pribadi. Kolom pribadi dan sensitif tidak pernah keluar.",
    sensitive: false,
  },
  "anggaran:read": { label: "Anggaran desa (ringkasan)", detail: "Pagu dan realisasi per kategori, tanpa rincian transaksi.", sensitive: false },
} as const;

export type ApiScope = keyof typeof API_SCOPES;
export const ALL_API_SCOPES = Object.keys(API_SCOPES) as ApiScope[];
export const isApiScope = (s: unknown): s is ApiScope => typeof s === "string" && Object.prototype.hasOwnProperty.call(API_SCOPES, s);

export type ParsedScopes = { ok: true; scopes: ApiScope[] } | { ok: false; error: string };

/** Validasi masukan klien: 1–10 scope dikenal, tanpa duplikat. */
export function parseScopes(input: unknown): ParsedScopes {
  if (!Array.isArray(input) || input.length === 0) return { ok: false, error: "Pilih minimal satu akses data." };
  const unknown = input.filter((s) => !isApiScope(s));
  if (unknown.length) return { ok: false, error: "Ada akses data yang tidak dikenal." };
  const scopes = [...new Set(input as ApiScope[])];
  if (scopes.length > 10) return { ok: false, error: "Terlalu banyak akses data dipilih." };
  return { ok: true, scopes };
}

/** Scope tersimpan di kolom JSON; tolak bentuk tak terduga dan buang scope yang sudah tidak dikenal. */
export function readScopes(value: unknown): ApiScope[] {
  return Array.isArray(value) ? value.filter(isApiScope) : [];
}
