/**
 * Istilah kesiapsiagaan bencana & Destana. Murni (tanpa Prisma), aman untuk klien.
 *
 * Sumber [V] (dibaca dari teks resmi, peraturan.bpk.go.id, Berita Negara 2025 No. 892):
 *  - Peraturan BNPB 7/2025 tentang Desa dan Kelurahan Tangguh Bencana, ditetapkan 24-10-2025, berlaku 31-10-2025.
 *    Pasal 22 MENCABUT Perka BNPB 1/2012. Pasal 8 ayat 1 huruf a-q = aktivitas Program Destana (katalog ACTIVITIES di bawah).
 *    Pasal 14 ayat 5-6: penilaian ketangguhan mandiri paling sedikit tiap 3 tahun; tingkat: utama, madya, pratama.
 *    Pasal 19 ayat 2: evaluasi minimal 1 kali dalam 1 tahun. Pasal 13: indikator Destana mengacu SNI.
 * Yang BELUM dibaca [R]: SNI 8357:2017 (indikator dasar/capaian) dan Pedoman Penilaian Ketangguhan (ditetapkan Kepala BNPB, Pasal 16).
 * Karena itu skor/tingkat resmi TIDAK dihitung aplikasi: tingkat dicatat sesuai hasil penilaian resmi desa, dan butir tambahan buatan
 * desa diberi label "belum diverifikasi".
 */

import { own } from "@/lib/incident/catalog";

export const REGULATION = {
  short: "Peraturan BNPB 7/2025",
  title: "Peraturan BNPB Nomor 7 Tahun 2025 tentang Desa dan Kelurahan Tangguh Bencana",
  enacted: "2025-10-24",
  effective: "2025-10-31",
  revokes: "Perka BNPB 1/2012 (Pasal 22)",
} as const;

export const HAZARD_TYPES = {
  BANJIR: "Banjir",
  TANAH_LONGSOR: "Tanah longsor",
  GEMPA_BUMI: "Gempa bumi",
  ANGIN_KENCANG: "Angin kencang / puting beliung",
  KEKERINGAN: "Kekeringan",
  KEBAKARAN: "Kebakaran",
  ERUPSI: "Letusan gunung api",
  TSUNAMI_ABRASI: "Tsunami / abrasi / gelombang tinggi",
  LAINNYA: "Lainnya",
} as const;
export type HazardType = keyof typeof HAZARD_TYPES;
export const isHazardType = (v: unknown): v is HazardType => typeof v === "string" && own(HAZARD_TYPES, v);

export const RISK_LEVELS = { LOW: "Rendah", MEDIUM: "Sedang", HIGH: "Tinggi", EXTREME: "Sangat tinggi" } as const;
export type RiskLevel = keyof typeof RISK_LEVELS;
export const isRiskLevel = (v: unknown): v is RiskLevel => typeof v === "string" && own(RISK_LEVELS, v);

/** Titik rawan lama (disaster_points) memakai kode Inggris; dipetakan saat impor. */
export const DISASTER_POINT_TYPE: Record<string, HazardType> = {
  flood: "BANJIR",
  landslide: "TANAH_LONGSOR",
  earthquake: "GEMPA_BUMI",
  fire: "KEBAKARAN",
  drought: "KEKERINGAN",
  other: "LAINNYA",
};
export const DISASTER_POINT_RISK: Record<string, RiskLevel> = { low: "LOW", medium: "MEDIUM", high: "HIGH", extreme: "EXTREME" };

export const RESOURCE_KINDS = {
  SHELTER: "Tempat pengungsian (shelter)",
  TITIK_KUMPUL: "Titik kumpul",
  JALUR_EVAKUASI: "Jalur evakuasi",
  PERALATAN: "Peralatan penanggulangan",
  STOK_LOGISTIK: "Stok logistik",
  SIRINE_EWS: "Sirine / alat peringatan dini",
  FASKES: "Fasilitas kesehatan",
  LAINNYA: "Lainnya",
} as const;
export type ResourceKind = keyof typeof RESOURCE_KINDS;
export const isResourceKind = (v: unknown): v is ResourceKind => typeof v === "string" && own(RESOURCE_KINDS, v);

export const CONDITIONS = { BAIK: "Baik", PERLU_PERBAIKAN: "Perlu perbaikan", RUSAK: "Rusak", BELUM_DIPERIKSA: "Belum diperiksa" } as const;
export type Condition = keyof typeof CONDITIONS;
export const isCondition = (v: unknown): v is Condition => typeof v === "string" && own(CONDITIONS, v);

export const PLAN_KINDS = {
  RPB: "Rencana penanggulangan bencana",
  KONTINJENSI: "Rencana kontinjensi",
  EVAKUASI: "Rencana evakuasi",
  SOP_PERINGATAN: "SOP peringatan dini",
  PERDES: "Peraturan desa penanggulangan bencana",
  LAINNYA: "Lainnya",
} as const;
export type PlanKind = keyof typeof PLAN_KINDS;
export const isPlanKind = (v: unknown): v is PlanKind => typeof v === "string" && own(PLAN_KINDS, v);

export const PLAN_STATUSES = { DRAF: "Draf", DITETAPKAN: "Ditetapkan", DIARSIPKAN: "Diarsipkan" } as const;
export type PlanStatus = keyof typeof PLAN_STATUSES;
export const isPlanStatus = (v: unknown): v is PlanStatus => typeof v === "string" && own(PLAN_STATUSES, v);

export const VOLUNTEER_STATUSES = { ACTIVE: "Aktif", INACTIVE: "Tidak aktif" } as const;
export type VolunteerStatus = keyof typeof VOLUNTEER_STATUSES;
export const isVolunteerStatus = (v: unknown): v is VolunteerStatus => typeof v === "string" && own(VOLUNTEER_STATUSES, v);

/** Tingkat peringatan: istilah aplikasi untuk siaran desa, BUKAN status peringatan resmi BMKG/PVMBG/BPBD. */
export const ALERT_LEVELS = { INFORMASI: "Informasi", WASPADA: "Waspada", SIAGA: "Siaga", AWAS: "Awas" } as const;
export type AlertLevel = keyof typeof ALERT_LEVELS;
export const isAlertLevel = (v: unknown): v is AlertLevel => typeof v === "string" && own(ALERT_LEVELS, v);

export const READINESS_STATUSES = { BELUM: "Belum", SEDANG: "Sedang dikerjakan", SELESAI: "Selesai" } as const;
export type ReadinessStatus = keyof typeof READINESS_STATUSES;
export const isReadinessStatus = (v: unknown): v is ReadinessStatus => typeof v === "string" && own(READINESS_STATUSES, v);

export const ASSESSMENT_KINDS = { PENILAIAN: "Penilaian ketangguhan", EVALUASI: "Evaluasi program" } as const;
export type AssessmentKind = keyof typeof ASSESSMENT_KINDS;
export const isAssessmentKind = (v: unknown): v is AssessmentKind => typeof v === "string" && own(ASSESSMENT_KINDS, v);

/** Tingkat ketangguhan [V Pasal 14 ayat 6]; BELUM_DITETAPKAN = penilaian dilakukan tetapi tingkat belum ditetapkan. */
export const LEVELS = { UTAMA: "Tangguh utama", MADYA: "Tangguh madya", PRATAMA: "Tangguh pratama", BELUM_DITETAPKAN: "Belum ditetapkan" } as const;
export type ResilienceLevel = keyof typeof LEVELS;
export const isLevel = (v: unknown): v is ResilienceLevel => typeof v === "string" && own(LEVELS, v);

/** Kode pengambilan data otomatis untuk petunjuk "terdeteksi dari data aplikasi". */
export type Detector = "HAZARD" | "VOLUNTEER" | "RESOURCE" | "PLAN_RPB" | "PLAN_KONTINJENSI" | "PLAN_PERDES" | "ASSESSMENT";

export interface ActivityDef {
  code: string;
  /** Rujukan pasal [V] */
  ref: string;
  label: string;
  detector?: Detector;
}

/** Aktivitas Program Destana, Peraturan BNPB 7/2025 Pasal 8 ayat 1 huruf a-q [V]. Judul dirapikan, urutan sama dengan teks. */
export const ACTIVITIES: readonly ActivityDef[] = [
  { code: "P8_A", ref: "Pasal 8(1) huruf a", label: "Mengintegrasikan layanan dasar sektor pembangunan desa dengan pengelolaan risiko bencana" },
  { code: "P8_B", ref: "Pasal 8(1) huruf b", label: "Menyusun peraturan dan kebijakan penanggulangan bencana tingkat desa", detector: "PLAN_PERDES" },
  { code: "P8_C", ref: "Pasal 8(1) huruf c", label: "Mengembangkan tata kelola lokal pada pelaku lokal" },
  { code: "P8_D", ref: "Pasal 8(1) huruf d", label: "Mengembangkan kapasitas masyarakat desa" },
  { code: "P8_E", ref: "Pasal 8(1) huruf e", label: "Melakukan Penilaian Ketangguhan Desa", detector: "ASSESSMENT" },
  { code: "P8_F", ref: "Pasal 8(1) huruf f", label: "Mengidentifikasi jenis dan karakteristik ancaman", detector: "HAZARD" },
  { code: "P8_G", ref: "Pasal 8(1) huruf g", label: "Mengidentifikasi kerentanan dan kapasitas aset berisiko" },
  { code: "P8_H", ref: "Pasal 8(1) huruf h", label: "Membentuk Forum Pengurangan Risiko Bencana (FPRB) desa" },
  { code: "P8_I", ref: "Pasal 8(1) huruf i", label: "Membentuk Tim Relawan Penanggulangan Bencana", detector: "VOLUNTEER" },
  { code: "P8_J", ref: "Pasal 8(1) huruf j", label: "Mengidentifikasi sumber daya dan pengetahuan lokal", detector: "RESOURCE" },
  { code: "P8_K", ref: "Pasal 8(1) huruf k", label: "Melakukan penilaian risiko bencana" },
  { code: "P8_L", ref: "Pasal 8(1) huruf l", label: "Membangun jejaring kemitraan" },
  { code: "P8_M", ref: "Pasal 8(1) huruf m", label: "Menyusun perencanaan penanggulangan bencana berbasis masyarakat", detector: "PLAN_RPB" },
  { code: "P8_N", ref: "Pasal 8(1) huruf n", label: "Melaksanakan rencana penanggulangan bencana berbasis masyarakat" },
  { code: "P8_O", ref: "Pasal 8(1) huruf o", label: "Mengintegrasikan rencana penanggulangan bencana ke dalam perencanaan pembangunan lokal" },
  { code: "P8_P", ref: "Pasal 8(1) huruf p", label: "Menyusun perencanaan penanggulangan kedaruratan bencana berbasis masyarakat", detector: "PLAN_KONTINJENSI" },
  { code: "P8_Q", ref: "Pasal 8(1) huruf q", label: "Meningkatkan kapasitas akses sumber daya, pembiayaan, teknologi, dan informasi penanggulangan bencana berbasis masyarakat" },
];
export const ACTIVITY_CODES: ReadonlySet<string> = new Set(ACTIVITIES.map((a) => a.code));

export const LIMITS = {
  hazards: 300,
  resources: 500,
  volunteers: 500,
  plans: 100,
  alertsPerDay: 10,
  alertTargets: 30,
  customItems: 40,
  assessments: 100,
  accountsPerAlert: 20_000,
} as const;

/** Tautan ke sumber [V] untuk dokumen dan layar. */
export const SOURCE_NOTES = [
  "Peraturan BNPB 7/2025 [V]: mencabut Perka BNPB 1/2012 (Pasal 22); aktivitas Destana Pasal 8(1); penilaian mandiri minimal tiap 3 tahun, tingkat utama/madya/pratama (Pasal 14); evaluasi minimal 1 kali per tahun (Pasal 19(2)).",
  "Indikator rinci SNI 8357:2017 dan Pedoman Penilaian Ketangguhan BNPB belum dibaca [R]: tingkat ketangguhan resmi tidak dihitung aplikasi, hanya dicatat dari hasil penilaian.",
] as const;
