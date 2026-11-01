/**
 * Istilah dan aturan Musyawarah Desa. Murni (tanpa Prisma) agar aman diimpor komponen klien.
 * Sumber [V]: Permendagri 114/2014 Pasal 20-22, 25-26, 28, 31-32, 46-50; Permendesa PDT 16/2025 Pasal 3, 9 dan Lampiran II.A.
 */

export const KINDS = {
  MUSDES_PERENCANAAN: {
    label: "Musyawarah Desa perencanaan pembangunan",
    basis: "Permendagri 114/2014 Pasal 20-22 dan 31-32",
    organizer: "Badan Permusyawaratan Desa",
  },
  MUSRENBANGDES: {
    label: "Musyawarah perencanaan pembangunan Desa (Musrenbangdes)",
    basis: "Permendagri 114/2014 Pasal 25-26 dan 46-48",
    organizer: "Kepala Desa",
  },
  MUSDES_PERUBAHAN: {
    label: "Musrenbangdes khusus perubahan RPJM/RKP Desa",
    basis: "Permendagri 114/2014 Pasal 28 dan 50",
    organizer: "Kepala Desa",
  },
  MUSDES_BLT: {
    label: "Musyawarah Desa penetapan penerima BLT Desa",
    basis: "Permendesa PDT 16/2025 Pasal 3 dan Lampiran II.A",
    organizer: "Badan Permusyawaratan Desa",
  },
  MUSDES_BLT_KHUSUS: {
    label: "Musyawarah Desa khusus penggantian penerima BLT Desa",
    basis: "Permendesa PDT 16/2025 Lampiran II.A.2.d",
    organizer: "Badan Permusyawaratan Desa",
  },
  MUSDES_BUMDES: {
    label: "Musyawarah Desa tentang BUM Desa (penyertaan modal, bagi hasil, laporan)",
    basis: "PP 11/2021 Pasal 17, 41 ayat 4, dan 59 ayat 2",
    organizer: "Badan Permusyawaratan Desa",
  },
  MUSDES_LAINNYA: {
    label: "Musyawarah Desa lainnya",
    basis: "Hal strategis Desa menurut UU 6/2014 tentang Desa",
    organizer: "Badan Permusyawaratan Desa",
  },
} as const;
export type MeetingKind = keyof typeof KINDS;
export const KIND_KEYS = Object.keys(KINDS) as MeetingKind[];
export const isKind = (v: unknown): v is MeetingKind => typeof v === "string" && Object.hasOwn(KINDS, v);

export const STATUS = {
  PLANNED: "Dijadwalkan",
  HELD: "Terlaksana (berita acara disusun)",
  FINAL: "Berita acara final",
  CANCELLED: "Dibatalkan",
} as const;
export type MeetingStatus = keyof typeof STATUS;

/** Unsur peserta. Sepuluh unsur masyarakat pertama = Permendagri 114/2014 Pasal 46 ayat 3; disabilitas dari Permendesa 16/2025 Pasal 9 ayat 2. */
export const UNSUR = {
  PEMERINTAH_DESA: "Pemerintah Desa",
  BPD: "Badan Permusyawaratan Desa",
  TOKOH_ADAT: "Tokoh adat",
  TOKOH_AGAMA: "Tokoh agama",
  TOKOH_MASYARAKAT: "Tokoh masyarakat",
  TOKOH_PENDIDIKAN: "Tokoh pendidikan",
  KELOMPOK_TANI: "Perwakilan kelompok tani",
  KELOMPOK_NELAYAN: "Perwakilan kelompok nelayan",
  KELOMPOK_PERAJIN: "Perwakilan kelompok perajin",
  KELOMPOK_PEREMPUAN: "Perwakilan kelompok perempuan",
  KELOMPOK_ANAK: "Perwakilan kelompok pemerhati dan pelindungan anak",
  KELOMPOK_MISKIN: "Perwakilan kelompok masyarakat miskin",
  DISABILITAS: "Perwakilan penyandang disabilitas",
  WARGA: "Warga / unsur masyarakat lain",
} as const;
export type Unsur = keyof typeof UNSUR;
export const UNSUR_KEYS = Object.keys(UNSUR) as Unsur[];
export const isUnsur = (v: unknown): v is Unsur => typeof v === "string" && Object.hasOwn(UNSUR, v);

/** Sepuluh unsur masyarakat yang disebut Pasal 46 ayat 3 untuk musyawarah perencanaan pembangunan Desa. */
export const MUSRENBANG_UNSUR: readonly Unsur[] = [
  "TOKOH_ADAT",
  "TOKOH_AGAMA",
  "TOKOH_MASYARAKAT",
  "TOKOH_PENDIDIKAN",
  "KELOMPOK_TANI",
  "KELOMPOK_NELAYAN",
  "KELOMPOK_PERAJIN",
  "KELOMPOK_PEREMPUAN",
  "KELOMPOK_ANAK",
  "KELOMPOK_MISKIN",
];

/** Jenis musyawarah yang pesertanya diperiksa keterwakilannya. */
export const INCLUSION_KINDS: readonly MeetingKind[] = ["MUSDES_PERENCANAAN", "MUSRENBANGDES", "MUSDES_PERUBAHAN", "MUSDES_BLT", "MUSDES_BLT_KHUSUS"];
export const FULL_REPRESENTATION_KINDS: readonly MeetingKind[] = ["MUSRENBANGDES", "MUSDES_PERUBAHAN"];

export const LIMITS = {
  meetingsPerVillage: 3000,
  attendeesPerMeeting: 500,
  decisionsPerMeeting: 100,
  bulkAttendees: 100,
  minutes: 20000,
  agenda: 4000,
} as const;

/** Peringatan inklusi tidak pernah memblokir: desa kecil boleh punya keterbatasan, tetapi harus melihatnya. */
export interface InclusionWarning {
  code: "NO_BPD" | "NO_VILLAGE_GOV" | "NO_WOMEN" | "NO_POOR" | "NO_DISABLED" | "NO_CHILD_GROUP" | "MISSING_UNSUR";
  message: string;
}
