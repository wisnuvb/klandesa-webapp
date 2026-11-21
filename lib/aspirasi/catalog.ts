/**
 * Katalog Aspirasi Warga publik: kategori, status moderasi, status tindak lanjut desa, alasan laporan konten, batas.
 * Murni (tanpa dependensi server) agar dipakai server, halaman publik, dan dasbor. Rancangan: docs/ASPIRASI_WARGA.md.
 */

export const ASPIRATION_CATEGORIES = [
  { value: "sampah", label: "Sampah dan kebersihan" },
  { value: "jalan", label: "Jalan dan jembatan" },
  { value: "air", label: "Air bersih dan drainase" },
  { value: "listrik", label: "Listrik dan penerangan" },
  { value: "kesehatan", label: "Kesehatan" },
  { value: "pendidikan", label: "Pendidikan" },
  { value: "keamanan", label: "Keamanan dan ketertiban" },
  { value: "lingkungan", label: "Lingkungan hidup" },
  { value: "pelayanan", label: "Pelayanan desa" },
  { value: "lainnya", label: "Lainnya" },
] as const;
export type AspirationCategory = (typeof ASPIRATION_CATEGORIES)[number]["value"];
const CATEGORY_VALUES = new Set<string>(ASPIRATION_CATEGORIES.map((c) => c.value));
export const isAspirationCategory = (v: unknown): v is AspirationCategory => typeof v === "string" && CATEGORY_VALUES.has(v);
export const categoryLabel = (v: string): string => ASPIRATION_CATEGORIES.find((c) => c.value === v)?.label ?? v;

/** Status moderasi platform. Hanya PUBLISHED yang tampil publik. */
export const MODERATION_STATUSES = ["PENDING", "PUBLISHED", "REJECTED", "HIDDEN", "REMOVED"] as const;
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];
export const MODERATION_LABELS: Record<ModerationStatus, string> = {
  PENDING: "Menunggu tinjauan",
  PUBLISHED: "Tayang",
  REJECTED: "Ditolak",
  HIDDEN: "Disembunyikan sementara",
  REMOVED: "Dihapus",
};

/** Status tindak lanjut (diatur desa lewat tanggapan). */
export const PROGRESS_STATUSES = ["NEW", "RESPONDED", "IN_PROGRESS", "RESOLVED", "DISPUTED"] as const;
export type AspirationProgress = (typeof PROGRESS_STATUSES)[number];
export const PROGRESS_LABELS: Record<AspirationProgress, string> = {
  NEW: "Menunggu tanggapan desa",
  RESPONDED: "Sudah ditanggapi desa",
  IN_PROGRESS: "Sedang diproses",
  RESOLVED: "Selesai",
  DISPUTED: "Disanggah desa",
};

/** Jenis tanggapan desa dan status tindak lanjut yang dihasilkannya. */
export const REPLY_KINDS = ["RESPONSE", "PROGRESS", "RESOLVED", "DISPUTE"] as const;
export type ReplyKind = (typeof REPLY_KINDS)[number];
export const REPLY_KIND_LABELS: Record<ReplyKind, string> = {
  RESPONSE: "Tanggapan",
  PROGRESS: "Kabar progres",
  RESOLVED: "Sudah selesai",
  DISPUTE: "Sanggahan (banding)",
};
export const REPLY_KIND_PROGRESS: Record<ReplyKind, AspirationProgress> = {
  RESPONSE: "RESPONDED",
  PROGRESS: "IN_PROGRESS",
  RESOLVED: "RESOLVED",
  DISPUTE: "DISPUTED",
};

export const FLAG_REASONS = ["PERSONAL_DATA", "DEFAMATION", "HOAX", "SPAM", "RESOLVED", "OTHER"] as const;
export type FlagReason = (typeof FLAG_REASONS)[number];
export const FLAG_REASON_LABELS: Record<FlagReason, string> = {
  PERSONAL_DATA: "Memuat data pribadi (nama, nomor, alamat rumah)",
  DEFAMATION: "Menyerang nama baik orang tertentu",
  HOAX: "Informasi tidak benar",
  SPAM: "Spam atau iklan",
  RESOLVED: "Masalah sudah selesai",
  OTHER: "Alasan lain",
};
export const isFlagReason = (v: unknown): v is FlagReason => typeof v === "string" && (FLAG_REASONS as readonly string[]).includes(v);

export const CLAIM_STATUSES = ["PENDING", "APPROVED", "REJECTED", "REVOKED"] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];
export const CLAIM_LABELS: Record<ClaimStatus, string> = {
  PENDING: "Menunggu verifikasi",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  REVOKED: "Dicabut",
};

export const LIMITS = {
  titleMin: 10,
  titleMax: 160,
  /** Isi minimal: laporan terlalu pendek tidak berguna dan dianggap konten tipis oleh mesin pencari. */
  bodyMin: 80,
  bodyMax: 3000,
  locationMax: 200,
  nameMax: 120,
  photosMax: 3,
  replyMin: 10,
  replyMax: 2000,
  flagDetailMax: 1000,
  claimEvidenceMin: 20,
  claimEvidenceMax: 2000,
  noteMax: 500,
} as const;

/** Batas laju (jendela dalam ms). Kunci dibentuk dari ipHash atau kontak, bukan nilai mentah. */
export const RATE = {
  submitPerIp: { max: 5, windowMs: 24 * 60 * 60_000 },
  submitPerContact: { max: 3, windowMs: 24 * 60 * 60_000 },
  statusCheck: { max: 20, windowMs: 60 * 60_000 },
  /** Percobaan cek status per kode laporan (kode tampil publik, jadi dibatasi agar kontak pelapor tak bisa ditebak). */
  statusPerCode: { max: 8, windowMs: 24 * 60 * 60_000 },
  flagPerVillage: { max: 5, windowMs: 24 * 60 * 60_000 },
  flagPerIp: { max: 10, windowMs: 60 * 60_000 },
  claimPerUser: { max: 3, windowMs: 24 * 60 * 60_000 },
  photoUploadPerIp: { max: 12, windowMs: 60 * 60_000 },
} as const;

/** Laporan baru baru boleh diindeks mesin pencari setelah masa tenggang ini (memberi desa kesempatan menanggapi/berkeberatan). */
export const INDEX_GRACE_DAYS = 7;
/** Panjang isi minimal agar sebuah laporan layak diindeks. */
export const INDEX_MIN_BODY_CHARS = 200;
/** Halaman desa baru diindeks bila punya setidaknya sekian laporan yang layak indeks. */
export const AREA_INDEX_MIN_ITEMS = 2;

export const ASPIRASI_BASE_PATH = "/aspirasi";
