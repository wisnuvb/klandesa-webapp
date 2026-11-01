/**
 * Istilah dan aturan pengadaan barang/jasa di desa. Murni (tanpa Prisma), aman dipakai klien.
 *
 * Sumber [V] (dibaca dari teks resmi): Peraturan LKPP 12/2019 (BN 2019/1455) Pasal 5, 6, 9, 10, 11, 13 dan Lampiran I;
 * Permendagri 20/2018 Pasal 52-55. Peraturan LKPP 12/2019 hanyalah PEDOMAN bagi bupati/wali kota menyusun Perbup
 * (Pasal 4 ayat 3-4); tata cara yang mengikat desa adalah Perbup kabupaten masing-masing, yang BELUM dibaca.
 * Karena itu semua ketentuan di sini diterapkan sebagai pagar proses yang dapat dijelaskan, dan ambang nilai TIDAK ditanam.
 */

export const MODES = { SWAKELOLA: "Swakelola", PENYEDIA: "Melalui penyedia" } as const;
export type Mode = keyof typeof MODES;
export const isMode = (v: unknown): v is Mode => typeof v === "string" && Object.hasOwn(MODES, v);

export const METHODS = {
  PEMBELIAN_LANGSUNG: "Pembelian langsung",
  PERMINTAAN_PENAWARAN: "Permintaan penawaran",
  LELANG: "Lelang",
} as const;
export type Method = keyof typeof METHODS;
export const isMethod = (v: unknown): v is Method => typeof v === "string" && Object.hasOwn(METHODS, v);

export const STATUS = {
  PERSIAPAN: "Persiapan",
  PEMILIHAN: "Pemilihan penyedia",
  PELAKSANAAN: "Pelaksanaan",
  SELESAI: "Selesai (BAST)",
  BATAL: "Dibatalkan",
} as const;
export type Status = keyof typeof STATUS;
export const isStatus = (v: unknown): v is Status => typeof v === "string" && Object.hasOwn(STATUS, v);

export const ROLES = { KETUA: "Ketua", SEKRETARIS: "Sekretaris", ANGGOTA: "Anggota" } as const;
export type Role = keyof typeof ROLES;
export const isRole = (v: unknown): v is Role => typeof v === "string" && Object.hasOwn(ROLES, v);

/** Unsur TPK: Peraturan LKPP 12/2019 Pasal 11 ayat 1. */
export const ELEMENTS = { PERANGKAT: "Perangkat Desa", LEMBAGA: "Lembaga kemasyarakatan desa", MASYARAKAT: "Masyarakat" } as const;
export type Element = keyof typeof ELEMENTS;
export const isElement = (v: unknown): v is Element => typeof v === "string" && Object.hasOwn(ELEMENTS, v);

export const LIMITS = { packagesPerYear: 1000, teamPerPackage: 15, offersPerPackage: 20 } as const;

/** TPK paling sedikit 3 orang dan berjumlah gasal (Pasal 11 ayat 2-3). */
export const TPK_MIN = 3;

/**
 * CONTOH jenjang nilai dari Lampiran I Peraturan LKPP 12/2019 (Bab III.B.2.c). Teks lampiran sendiri menyatakan
 * "dapat ditetapkan berbeda oleh Bupati/Walikota", sehingga ini bukan aturan: hanya nilai awal yang bisa dipakai desa.
 */
export const EXAMPLE_LIMITS = { directLimit: 10_000_000, offerLimit: 200_000_000 } as const;

export const SOURCES = [
  { ref: "Peraturan LKPP 12/2019 Pasal 5-6", note: "Swakelola diutamakan; penyedia bila tidak dapat swakelola", status: "V" },
  { ref: "Peraturan LKPP 12/2019 Pasal 9-11", note: "Tugas Kepala Desa, Kasi/Kaur, dan TPK (minimal 3 orang, gasal; ketua, sekretaris, anggota)", status: "V" },
  { ref: "Peraturan LKPP 12/2019 Lampiran I Bab II-IV", note: "Persiapan, HPS/RAB, pembelian langsung, permintaan penawaran, lelang, negosiasi, serah terima (BAST)", status: "V" },
  { ref: "Permendagri 20/2018 Pasal 52-55", note: "Pelaksanaan kegiatan swakelola/penyedia; SPP penyedia setelah barang/jasa diterima, dilampiri bukti penerimaan", status: "V" },
  { ref: "Perbup tentang pengadaan barang/jasa di desa (kabupaten Anda)", note: "Ambang nilai, metode, dan tata cara yang mengikat desa: belum dibaca; desa mengisi ambang sendiri", status: "R" },
] as const;

export const REFS = {
  swakelola: "Peraturan LKPP 12/2019 Pasal 5",
  tpk: "Peraturan LKPP 12/2019 Pasal 11 ayat 2-4",
  tpkDecree: "Peraturan LKPP 12/2019 Pasal 9 huruf a",
  pagu: "Peraturan LKPP 12/2019 Pasal 10 ayat 3 dan Lampiran I Bab II",
  kaurKeuangan: "Peraturan LKPP 12/2019 Pasal 10 ayat 4",
  negotiation: "Peraturan LKPP 12/2019 Lampiran I Bab III.B.2",
  twoOffers: "Peraturan LKPP 12/2019 Lampiran I Bab III.B.2.b.2",
  lowest: "Peraturan LKPP 12/2019 Lampiran I Bab III.B.2",
  bast: "Peraturan LKPP 12/2019 Lampiran I Bab IV",
  announce: "Peraturan LKPP 12/2019 Pasal 9 huruf b dan Pasal 11 ayat 5 huruf f",
  spp: "Permendagri 20/2018 Pasal 55",
} as const;
