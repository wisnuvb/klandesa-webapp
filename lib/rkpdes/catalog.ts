/**
 * Istilah siklus RKP Desa. Murni (tanpa Prisma), aman untuk klien.
 * Sumber [V]: Permendagri 114/2014 Pasal 29-51 (BN 2094/2014), Permendesa PDT 16/2025 Pasal 1 angka 4 dan Pasal 8.
 */

export const PAGU_SOURCES = {
  DD: "Dana Desa",
  ADD: "Alokasi Dana Desa",
  BHPRD: "Bagi hasil pajak dan retribusi daerah",
  BKP: "Bantuan keuangan provinsi",
  BKK: "Bantuan keuangan kabupaten/kota",
  PADES: "Pendapatan Asli Desa",
  SWADAYA: "Swadaya masyarakat",
  PIHAK_KETIGA: "Bantuan pihak ketiga",
  LAIN: "Lain-lain",
} as const;
export type PaguSource = keyof typeof PAGU_SOURCES;
export const PAGU_KEYS = Object.keys(PAGU_SOURCES) as PaguSource[];
export const isPaguSource = (v: unknown): v is PaguSource => typeof v === "string" && v in PAGU_SOURCES;

/** Cara pelaksanaan kegiatan skala lokal Desa (Pasal 52 ayat 3). */
export const METHODS = {
  SWAKELOLA: "Swakelola Desa",
  KERJASAMA_DESA: "Kerja sama antar-Desa",
  PIHAK_KETIGA: "Kerja sama dengan pihak ketiga",
} as const;
export type Method = keyof typeof METHODS;
export const isMethod = (v: unknown): v is Method => typeof v === "string" && v in METHODS;

/** Peran dalam tim penyusun RKP Desa (Pasal 33 ayat 2). */
export const TEAM_ROLES = {
  PEMBINA: "Pembina (Kepala Desa)",
  KETUA: "Ketua (Sekretaris Desa)",
  SEKRETARIS: "Sekretaris (Ketua lembaga pemberdayaan masyarakat)",
  ANGGOTA: "Anggota",
} as const;
export type TeamRole = keyof typeof TEAM_ROLES;
export const isTeamRole = (v: unknown): v is TeamRole => typeof v === "string" && v in TEAM_ROLES;
export const TEAM_LIMITS = { min: 7, max: 11 } as const;

export const INCOMING_LEVELS = { PUSAT: "Pemerintah (pusat)", PROVINSI: "Pemerintah daerah provinsi", KABUPATEN: "Pemerintah daerah kabupaten/kota" } as const;
export type IncomingLevel = keyof typeof INCOMING_LEVELS;
export const isIncomingLevel = (v: unknown): v is IncomingLevel => typeof v === "string" && v in INCOMING_LEVELS;

/** Alasan RKP Desa perubahan (Pasal 49 ayat 1). */
export const CHANGE_REASONS = {
  PERISTIWA_KHUSUS: "Peristiwa khusus (bencana alam, krisis politik/ekonomi, atau kerusuhan sosial berkepanjangan)",
  KEBIJAKAN: "Perubahan mendasar atas kebijakan Pemerintah, pemerintah daerah provinsi, atau kabupaten/kota",
} as const;
export type ChangeReason = keyof typeof CHANGE_REASONS;
export const isChangeReason = (v: unknown): v is ChangeReason => typeof v === "string" && v in CHANGE_REASONS;

export const LIMITS = { documentsPerVillage: 60, activitiesPerDocument: 500, incomingPerDocument: 200, evaluation: 20000, revisions: 5 } as const;

/** RPJM Desa kini 8 tahun (Permendesa PDT 16/2025 Pasal 1 angka 4 [V]; UU 3/2024 [R]); dokumen lama berjangka 6 tahun. */
export const RPJMDES_TERM_YEARS = { current: 8, legacy: 6 } as const;

/** Keterangan jangka waktu RPJM Desa terhadap aturan 8 tahun; `termNote` null bila sudah 8 tahun. */
export function termInfo(periodStart: number, periodEnd: number): { termYears: number; termNote: string | null } {
  const years = periodEnd - periodStart + 1;
  let termNote: string | null = null;
  if (years === RPJMDES_TERM_YEARS.legacy) termNote = "RPJM Desa berjangka 6 tahun (aturan lama). RPJM Desa kini berjangka 8 tahun; sesuaikan bila masa jabatan Kepala Desa sudah 8 tahun.";
  else if (years !== RPJMDES_TERM_YEARS.current) termNote = `RPJM Desa berjangka ${years} tahun. Jangka waktu yang berlaku sekarang 8 tahun (Permendesa PDT 16/2025 Pasal 1 angka 4).`;
  return { termYears: years, termNote };
}
