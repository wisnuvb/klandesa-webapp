/** Istilah dan alur usulan pemutakhiran DTSEN dari desa. Murni (tanpa Prisma), aman dipakai di komponen klien. */

export const KIND_LABEL = {
  TAMBAH: "Usul masuk DTSEN",
  UBAH: "Usul perubahan data/desil",
  HAPUS: "Usul dikeluarkan",
} as const;
export type Kind = keyof typeof KIND_LABEL;
export const KINDS = Object.keys(KIND_LABEL) as Kind[];
export const isKind = (v: unknown): v is Kind => typeof v === "string" && Object.prototype.hasOwnProperty.call(KIND_LABEL, v);

export const SOURCE_LABEL = { WARGA: "Warga sendiri", RT: "Ketua RT/RW", PETUGAS: "Petugas desa", LAINNYA: "Lainnya" } as const;
export type Source = keyof typeof SOURCE_LABEL;
export const SOURCES = Object.keys(SOURCE_LABEL) as Source[];
export const isSource = (v: unknown): v is Source => typeof v === "string" && Object.prototype.hasOwnProperty.call(SOURCE_LABEL, v);

export const STATUS_LABEL = {
  DIAJUKAN: "Diajukan",
  TERVERIFIKASI: "Sudah diverifikasi lapangan",
  DISETUJUI_MUSDES: "Disetujui musyawarah desa",
  DITOLAK_MUSDES: "Tidak disetujui musyawarah desa",
  DITERUSKAN: "Diteruskan ke Dinas Sosial",
  SELESAI: "Selesai (ada hasil)",
  DIBATALKAN: "Dibatalkan",
} as const;
export type Status = keyof typeof STATUS_LABEL;
export const STATUSES = Object.keys(STATUS_LABEL) as Status[];
export const isStatus = (v: unknown): v is Status => typeof v === "string" && Object.prototype.hasOwnProperty.call(STATUS_LABEL, v);

/** Alur satu arah. Status akhir: DITOLAK_MUSDES, SELESAI, DIBATALKAN. Setelah diteruskan hanya hasil yang boleh dicatat. */
export const TRANSITIONS: Record<Status, readonly Status[]> = {
  DIAJUKAN: ["TERVERIFIKASI", "DIBATALKAN"],
  TERVERIFIKASI: ["DISETUJUI_MUSDES", "DITOLAK_MUSDES", "DIBATALKAN"],
  DISETUJUI_MUSDES: ["DITERUSKAN", "DIBATALKAN"],
  DITOLAK_MUSDES: [],
  DITERUSKAN: ["SELESAI"],
  SELESAI: [],
  DIBATALKAN: [],
};
export const isFinal = (s: Status): boolean => TRANSITIONS[s].length === 0;

export const OUTCOME_LABEL = { DITERIMA: "Diterima", DITOLAK: "Ditolak" } as const;
export type Outcome = keyof typeof OUTCOME_LABEL;

/** Usulan yang berhenti di satu tahap lebih dari ini ditandai "perlu ditindaklanjuti" (pengingat kerja, bukan tenggat hukum). */
export const STALE_DAYS = 30;

export const LIMITS = { proposalsPerVillage: 50000, bulk: 100 } as const;
