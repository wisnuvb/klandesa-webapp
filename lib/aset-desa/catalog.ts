/** Istilah dan aturan Buku Inventaris Aset Desa (Permendagri 1/2016: Pasal 2, 4, 21-23, Lampiran C). */

export interface CategoryDef {
  label: string;
  group: "ASLI" | "UMUM";
  /** Aset strategis (Pasal 4 ayat 3): penghapusannya harus lewat musyawarah desa dan persetujuan Bupati/Wali Kota (Pasal 22). */
  strategic: boolean;
}

export const CATEGORIES = {
  TANAH_KAS_DESA: { label: "Tanah kas desa", group: "ASLI", strategic: true },
  TANAH_ULAYAT: { label: "Tanah ulayat", group: "ASLI", strategic: true },
  PASAR_DESA: { label: "Pasar desa", group: "ASLI", strategic: true },
  PASAR_HEWAN: { label: "Pasar hewan", group: "ASLI", strategic: true },
  TAMBATAN_PERAHU: { label: "Tambatan perahu", group: "ASLI", strategic: true },
  BANGUNAN_DESA: { label: "Bangunan desa", group: "ASLI", strategic: true },
  PELELANGAN_IKAN: { label: "Pelelangan ikan", group: "ASLI", strategic: true },
  PELELANGAN_HASIL_TANI: { label: "Pelelangan hasil pertanian", group: "ASLI", strategic: true },
  HUTAN_DESA: { label: "Hutan milik desa", group: "ASLI", strategic: true },
  MATA_AIR: { label: "Mata air milik desa", group: "ASLI", strategic: true },
  PEMANDIAN_UMUM: { label: "Pemandian umum", group: "ASLI", strategic: true },
  ASLI_LAINNYA: { label: "Kekayaan asli desa lainnya", group: "ASLI", strategic: true },
  PERALATAN_MESIN: { label: "Peralatan dan mesin", group: "UMUM", strategic: false },
  KENDARAAN: { label: "Kendaraan", group: "UMUM", strategic: false },
  MEBEL_PERLENGKAPAN: { label: "Meja, kursi, dan perlengkapan kantor", group: "UMUM", strategic: false },
  KOMPUTER_ELEKTRONIK: { label: "Komputer dan elektronik", group: "UMUM", strategic: false },
  GEDUNG_BANGUNAN: { label: "Gedung dan bangunan", group: "UMUM", strategic: false },
  JALAN_JARINGAN: { label: "Jalan, irigasi, dan jaringan", group: "UMUM", strategic: false },
  TANAH: { label: "Tanah (bukan tanah kas desa)", group: "UMUM", strategic: false },
  ASET_LAINNYA: { label: "Aset lainnya", group: "UMUM", strategic: false },
} as const satisfies Record<string, CategoryDef>;

export type CategoryKey = keyof typeof CATEGORIES;
export const CATEGORY_KEYS = Object.keys(CATEGORIES) as CategoryKey[];

export const isCategory = (v: unknown): v is CategoryKey => typeof v === "string" && Object.prototype.hasOwnProperty.call(CATEGORIES, v);
export const isStrategic = (category: string): boolean => (isCategory(category) ? CATEGORIES[category].strategic : false);

export const ORIGIN_LABEL = {
  APBDES: "APBDesa",
  PEROLEHAN_LAIN: "Perolehan lain yang sah",
  ASLI_DESA: "Kekayaan asli desa",
} as const;
export type Origin = keyof typeof ORIGIN_LABEL;
export const ORIGINS = Object.keys(ORIGIN_LABEL) as Origin[];

export const CONDITION_LABEL = {
  BAIK: "Baik",
  RUSAK_RINGAN: "Rusak ringan",
  RUSAK_BERAT: "Rusak berat",
} as const;
export type Condition = keyof typeof CONDITION_LABEL;
export const CONDITIONS = Object.keys(CONDITION_LABEL) as Condition[];

export const DISPOSAL_REASON_LABEL = {
  BERALIH_KEPEMILIKAN: "Beralih kepemilikan (dijual, ditukar, hibah, atau putusan pengadilan)",
  PEMUSNAHAN: "Pemusnahan (tidak dapat dimanfaatkan lagi)",
  SEBAB_LAIN: "Sebab lain (hilang, kecurian, terbakar)",
} as const;
export type DisposalReason = keyof typeof DISPOSAL_REASON_LABEL;
export const DISPOSAL_REASONS = Object.keys(DISPOSAL_REASON_LABEL) as DisposalReason[];

export const LIMITS = { itemsPerVillage: 20000, maxQuantity: 1_000_000, maxValue: 99_999_999_999_999 } as const;
