/**
 * Istilah dan aturan tahapan penyusunan RPJM Desa. Murni (tanpa Prisma), aman untuk klien.
 *
 * Status sumber hukum (lengkap di docs/PHASE3_RPJM.md):
 *  [V] UU 3/2024 Pasal 39 dan 79 (peraturan.bpk.go.id, UU Nomor 3 Tahun 2024).
 *  [V] PP 16/2026 Pasal 142-149 (ditetapkan 27 Maret 2026, berlaku sejak diundangkan, mencabut PP 43/2014).
 *  [V] Permendagri 114/2014 Pasal 4-28 (BN 2094/2014). Catatan: nomor pasal RPJM Desa di teks resmi 4-28, bukan 14-30.
 *      Teksnya menyebut "6 tahun"; angka itu sudah digantikan UU dan PP di atas. Status berlakunya kini dicatat BPK "Berlaku",
 *      tetapi PP induknya (PP 43/2014) dicabut; apakah tahapan rincinya masih mengikat TIDAK dipastikan di sini.
 *  [V] teks Permendesa PDTT 21/2020 Pasal 22-33; [R] status berlakunya: BPK menandainya dicabut oleh Permendesa PDT 13/2025,
 *      tetapi Pasal 185 Permendesa PDT 13/2025 hanya mencabut ketentuan tentang SID, Pendataan Desa, dan Rencana Jangka Menengah SDGs Desa.
 *  [V] Permendesa PDT 13/2025 Pasal 1 angka 13, 126-136, 183 huruf c (pengundangan 4 Desember 2025 menurut metadata BPK).
 * Karena sumber-sumber tahapan bertentangan urutannya (Musdes dulu atau Musrenbang dulu), aplikasi memakai gerbang yang
 * sama pada ketiganya saja dan menjadikan sisanya peringatan berlabel sumber, tidak memblokir.
 */

import { METHODS, PAGU_SOURCES, RPJMDES_TERM_YEARS } from "@/lib/rkpdes/catalog";

export { METHODS, PAGU_SOURCES, RPJMDES_TERM_YEARS };

/** Aturan yang berupa angka. Disatukan di sini agar mudah ditinjau dan diubah bila aturan berganti. */
export const RPJM_RULES = {
  /** [V] UU 3/2024 Pasal 79 ayat 2 huruf a; PP 16/2026 Pasal 143 ayat 2 huruf a; Permendesa PDT 13/2025 Pasal 1 angka 13. */
  termYears: 8,
  /** [V] Permendagri 114/2014 Pasal 4 ayat 1 huruf a (aturan lama). */
  legacyTermYears: 6,
  /** [V] PP 16/2026 Pasal 145 ayat 4: RPJM Desa ditetapkan paling lama 3 bulan sejak pelantikan Kepala Desa. */
  perdesMonthsAfterInauguration: 3,
  /** [V] UU 3/2024 Pasal 39 ayat 1: masa jabatan Kepala Desa 8 tahun sejak pelantikan. */
  headTermYears: 8,
  /** Jumlah anggota tim penyusun. Batas bawah 7 ada di Permendagri 114/2014 Pasal 8 ayat 3 dan Permendesa 21/2020 Pasal 27 ayat 4 (sama). */
  teamMin: 7,
  /** Hanya Permendagri 114/2014 Pasal 8 ayat 3 (satu sumber): peringatan berlabel, tidak memblokir. */
  teamMaxSingleSource: 11,
  /** Hanya Permendesa 21/2020 Pasal 27 ayat 5 (satu sumber): peringatan berlabel, tidak memblokir. */
  womenShareSingleSource: 0.3,
  /** Permendesa PDT 13/2025 Pasal 183 huruf c: perencanaan menyesuaikan paling lama 1 tahun sejak diundangkan (4 Desember 2025). */
  sdgsAdaptationDeadline: "2026-12-04",
} as const;

/** Bidang kegiatan RPJM Desa (Permendagri 114/2014 Pasal 6 ayat 1; PP 16/2026 Pasal 142 ayat 3). Kode sama dengan bidang 1-4 Permendagri 20/2018. */
export const FIELDS = {
  "1": "Penyelenggaraan Pemerintahan Desa",
  "2": "Pelaksanaan Pembangunan Desa",
  "3": "Pembinaan Kemasyarakatan Desa",
  "4": "Pemberdayaan Masyarakat Desa",
} as const;
export type FieldCode = keyof typeof FIELDS;
export const FIELD_KEYS = Object.keys(FIELDS) as FieldCode[];
export const isFieldCode = (v: unknown): v is FieldCode => typeof v === "string" && Object.hasOwn(FIELDS, v);

/** Peran dalam tim penyusun. Pembina/ketua/sekretaris sama di Permendagri 114/2014 Pasal 8 dan Permendesa 21/2020 Pasal 27. */
export const TEAM_ROLES = {
  PEMBINA: "Pembina (Kepala Desa)",
  KETUA: "Ketua",
  SEKRETARIS: "Sekretaris",
  ANGGOTA: "Anggota",
} as const;
export type TeamRole = keyof typeof TEAM_ROLES;
export const isTeamRole = (v: unknown): v is TeamRole => typeof v === "string" && Object.hasOwn(TEAM_ROLES, v);

/** Alasan pembukaan kunci untuk perubahan RPJM Desa (Permendagri 114/2014 Pasal 28 ayat 1; PP 16/2026 Pasal 148 ayat 1). */
export const CHANGE_REASONS = {
  PERISTIWA_KHUSUS: "Peristiwa khusus (bencana alam, krisis politik/ekonomi, atau kerusuhan sosial berkepanjangan)",
  KEBIJAKAN: "Perubahan mendasar atas kebijakan Pemerintah, pemerintah daerah provinsi, atau kabupaten/kota",
} as const;
export type ChangeReason = keyof typeof CHANGE_REASONS;
export const isChangeReason = (v: unknown): v is ChangeReason => typeof v === "string" && Object.hasOwn(CHANGE_REASONS, v);

/** Jenis musyawarah yang sah untuk tiap tautan (musyawarah dari modul Musyawarah Desa). */
export const MEETING_KINDS = {
  musdes: ["MUSDES_PERENCANAAN"],
  /** Pembahasan rancangan: Musrenbangdes (114/2014 Pasal 25), atau Musyawarah Desa sendiri (PP 16/2026 Pasal 144 ayat 2). */
  draft: ["MUSRENBANGDES", "MUSDES_PERENCANAAN"],
  /** Setelah kunci dibuka untuk perubahan (Pasal 28 ayat 2; PP 16/2026 Pasal 148 ayat 2). */
  draftAmendment: ["MUSDES_PERUBAHAN"],
} as const;

export const LIMITS = {
  plansPerVillage: 30,
  programsPerPlan: 1500,
  teamHardMax: 25,
  text: 20000,
  programDescription: 2000,
  maxPeriodYears: 12,
} as const;

export const EVENT_KINDS = {
  REOPEN: "Dibuka untuk perubahan",
  BYPASS: "Perdes dicatat sebagai sudah ada sebelum aplikasi (gerbang dilewati)",
  REVOKE: "Persetujuan Kepala Desa dicabut karena isi berubah",
} as const;
export type EventKind = keyof typeof EVENT_KINDS;
