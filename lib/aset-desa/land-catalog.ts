/**
 * Tanah kas desa dan pemanfaatan aset (sewa, kerja sama pemanfaatan, bangun guna serah / serah guna).
 * Sumber hukum: Permendagri 1/2016 (Berita Negara 2016 No. 53) Pasal 2, 4, 11-18, 19, 22, 27, 30 [V: dibaca dari teks resmi].
 * Istilah jenis bukti hak tanah dan kebijakan peringatan adalah [R] / kebijakan aplikasi: tertulis eksplisit di bawah.
 */
import type { CategoryKey } from "./catalog";

/** Golongan barang yang dapat diberi atribut tanah (luas, batas, bukti hak). */
export const LAND_CATEGORIES: readonly CategoryKey[] = ["TANAH_KAS_DESA", "TANAH", "TANAH_ULAYAT"];
export const isLandCategory = (c: string): boolean => (LAND_CATEGORIES as readonly string[]).includes(c);

/**
 * Golongan yang dapat dibuatkan perjanjian pemanfaatan. Tanah ulayat dikecualikan (bukan milik pemerintah desa).
 * Hutan dan mata air dikecualikan agar tidak keliru: pemanfaatannya biasanya diatur sektor tersendiri.
 */
export const LEASABLE_CATEGORIES: readonly CategoryKey[] = [
  "TANAH_KAS_DESA",
  "TANAH",
  "BANGUNAN_DESA",
  "GEDUNG_BANGUNAN",
  "PASAR_DESA",
  "PASAR_HEWAN",
  "TAMBATAN_PERAHU",
  "PEMANDIAN_UMUM",
  "PELELANGAN_IKAN",
  "PELELANGAN_HASIL_TANI",
  "ASLI_LAINNYA",
];
export const isLeasable = (c: string): boolean => (LEASABLE_CATEGORIES as readonly string[]).includes(c);
/** Pasal 30: penilaian untuk pemanfaatan berupa tanah dan/atau bangunan. */
export const NEEDS_APPRAISAL: readonly CategoryKey[] = ["TANAH_KAS_DESA", "TANAH", "BANGUNAN_DESA", "GEDUNG_BANGUNAN"];

/** Istilah bukti hak [R: belum diverifikasi]. Label netral; desa mencatat apa yang tertera di dokumennya. */
export const RIGHT_KINDS = {
  SHM: "Sertipikat Hak Milik",
  SHP: "Sertipikat Hak Pakai",
  HPL: "Sertipikat Hak Pengelolaan",
  SHGB: "Sertipikat Hak Guna Bangunan",
  LETTER_C: "Letter C / kutipan buku C desa",
  GIRIK: "Girik / petok D",
  LAINNYA: "Bukti lain",
  BELUM_ADA: "Belum ada bukti hak",
} as const;
export type RightKind = keyof typeof RIGHT_KINDS;
export const RIGHT_KIND_KEYS = Object.keys(RIGHT_KINDS) as RightKind[];
export const isRightKind = (v: unknown): v is RightKind => typeof v === "string" && Object.prototype.hasOwnProperty.call(RIGHT_KINDS, v);
/** Hanya sertipikat yang dianggap bukti hak terdaftar; Letter C/girik = petunjuk, disarankan didaftarkan [R]. */
export const REGISTERED_RIGHTS: readonly RightKind[] = ["SHM", "SHP", "HPL", "SHGB"];

export const USAGES = {
  TIDAK_DIMANFAATKAN: "Belum dimanfaatkan",
  DIGUNAKAN_PEMDES: "Digunakan pemerintah desa (Pasal 10)",
  DIKELOLA_DESA: "Dikelola desa / BUMDes",
  BENGKOK: "Tanah bengkok (penghasilan perangkat) [istilah belum diverifikasi]",
  DISEWAKAN: "Disewakan",
  KERJA_SAMA: "Kerja sama pemanfaatan",
  BGS_BSG: "Bangun guna serah / serah guna",
  SENGKETA: "Dalam sengketa",
} as const;
export type Usage = keyof typeof USAGES;
export const USAGE_KEYS = Object.keys(USAGES) as Usage[];
export const isUsage = (v: unknown): v is Usage => typeof v === "string" && Object.prototype.hasOwnProperty.call(USAGES, v);

export interface AgreementKindDef {
  label: string;
  /** Jangka waktu paling lama (tahun), dapat diperpanjang dengan perjanjian baru. */
  maxYears: number;
  /** Pasal 17: izin tertulis Bupati/Wali Kota. */
  needsRegencyPermit: boolean;
  /** Pasal yang menjadi dasar batas dan syarat. */
  basis: string;
  /** Nama tagihan di layar: sewa vs kontribusi. */
  chargeLabel: string;
}
export const AGREEMENT_KINDS = {
  SEWA: { label: "Sewa", maxYears: 3, needsRegencyPermit: false, basis: "Pasal 12 ayat 2: paling lama 3 tahun", chargeLabel: "Sewa" },
  KERJASAMA: { label: "Kerja sama pemanfaatan", maxYears: 15, needsRegencyPermit: true, basis: "Pasal 14 ayat 3 huruf c: paling lama 15 tahun; Pasal 17: izin tertulis Bupati/Wali Kota", chargeLabel: "Kontribusi" },
  BGS_BSG: { label: "Bangun guna serah / bangun serah guna", maxYears: 20, needsRegencyPermit: true, basis: "Pasal 16 ayat 1: paling lama 20 tahun; Pasal 17: izin tertulis Bupati/Wali Kota", chargeLabel: "Kontribusi" },
} as const satisfies Record<string, AgreementKindDef>;
export type AgreementKind = keyof typeof AGREEMENT_KINDS;
export const AGREEMENT_KIND_KEYS = Object.keys(AGREEMENT_KINDS) as AgreementKind[];
export const isAgreementKind = (v: unknown): v is AgreementKind => typeof v === "string" && Object.prototype.hasOwnProperty.call(AGREEMENT_KINDS, v);

export const PERIOD_UNITS = { BULAN: "Per bulan", TAHUN: "Per tahun", SEKALI: "Sekali bayar (lunas di awal)" } as const;
export type PeriodUnit = keyof typeof PERIOD_UNITS;
export const PERIOD_UNIT_KEYS = Object.keys(PERIOD_UNITS) as PeriodUnit[];
export const isPeriodUnit = (v: unknown): v is PeriodUnit => typeof v === "string" && Object.prototype.hasOwnProperty.call(PERIOD_UNITS, v);

export const AGREEMENT_STATUS = { DRAF: "Draf", AKTIF: "Berlaku", SELESAI: "Selesai", BATAL: "Dibatalkan" } as const;
export type AgreementStatus = keyof typeof AGREEMENT_STATUS;
export const CHARGE_STATUS = { BELUM: "Belum diterima", DITERIMA: "Diterima", BATAL: "Dibatalkan" } as const;
export type ChargeStatus = keyof typeof CHARGE_STATUS;

export const LESSEE_KINDS = { PERORANGAN: "Perorangan", BADAN: "Badan usaha / lembaga" } as const;
export type LesseeKind = keyof typeof LESSEE_KINDS;
export const isLesseeKind = (v: unknown): v is LesseeKind => typeof v === "string" && Object.prototype.hasOwnProperty.call(LESSEE_KINDS, v);

export const DOC_KINDS = {
  PERJANJIAN: "Surat perjanjian",
  PERDES: "Peraturan Desa pemanfaatan",
  IZIN_BUPATI: "Izin tertulis Bupati/Wali Kota",
  PENILAIAN: "Laporan penilaian",
  BUKTI_HAK: "Bukti hak tanah",
  LAINNYA: "Dokumen lain",
} as const;
export type DocKind = keyof typeof DOC_KINDS;
export const isDocKind = (v: unknown): v is DocKind => typeof v === "string" && Object.prototype.hasOwnProperty.call(DOC_KINDS, v);

/**
 * Rekening Pendapatan Asli Desa "Hasil Aset" (Permendagri 20/2018 lampiran A.2, sudah ada di katalog APB Desa) yang boleh dipakai.
 * 4.1.2.90 = lain-lain (kode 4.1.2.90-99 pada katalog).
 */
export const LEASE_ACCOUNTS = ["4.1.2.01", "4.1.2.02", "4.1.2.03", "4.1.2.04", "4.1.2.05", "4.1.2.06", "4.1.2.07", "4.1.2.08", "4.1.2.90"] as const;
export const isLeaseAccount = (c: unknown): c is (typeof LEASE_ACCOUNTS)[number] => typeof c === "string" && (LEASE_ACCOUNTS as readonly string[]).includes(c);

/** Rekening bawaan menurut golongan barang; operator boleh menggantinya. */
export function defaultAccountFor(category: string): (typeof LEASE_ACCOUNTS)[number] {
  switch (category) {
    case "TANAH_KAS_DESA":
    case "TANAH":
      return "4.1.2.01";
    case "TAMBATAN_PERAHU":
      return "4.1.2.02";
    case "PASAR_DESA":
    case "PASAR_HEWAN":
      return "4.1.2.03";
    case "PEMANDIAN_UMUM":
      return "4.1.2.04";
    case "PELELANGAN_IKAN":
      return "4.1.2.06";
    default:
      return "4.1.2.90";
  }
}

/** Kebijakan aplikasi (BUKAN aturan hukum): ambang peringatan dalam hari. */
export const WARN = { chargeSoonDays: 30, endingSoonDays: 90 } as const;

export const LIMITS = { agreementsPerVillage: 2000, chargesPerAgreement: 240, docsPerAgreement: 20, parcelsPerVillage: 20000 } as const;

export const MAX_AREA = 99_999_999_999; // m2 (batas kolom DECIMAL(14,2))
