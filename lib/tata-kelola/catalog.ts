/** Istilah dan daftar pilihan modul tata kelola desa. Murni (tanpa Prisma) supaya aman dipakai di komponen klien. */

export const LEGAL_TYPE_LABEL = {
  PERDES: "Peraturan Desa",
  PERKADES: "Peraturan Kepala Desa",
  PERBER: "Peraturan Bersama Kepala Desa",
  KEPKADES: "Keputusan Kepala Desa",
  LAINNYA: "Lainnya",
} as const;
export type LegalType = keyof typeof LEGAL_TYPE_LABEL;
export const LEGAL_TYPES = Object.keys(LEGAL_TYPE_LABEL) as LegalType[];
export const isLegalType = (v: unknown): v is LegalType => typeof v === "string" && Object.prototype.hasOwnProperty.call(LEGAL_TYPE_LABEL, v);


export const DIRECTION_LABEL = { IN: "Surat masuk", OUT: "Surat keluar" } as const;
export type Direction = keyof typeof DIRECTION_LABEL;
export const isDirection = (v: unknown): v is Direction => v === "IN" || v === "OUT";

export const NATURE_LABEL = { BIASA: "Biasa", PENTING: "Penting", SEGERA: "Segera", RAHASIA: "Rahasia" } as const;
export type Nature = keyof typeof NATURE_LABEL;
export const NATURES = Object.keys(NATURE_LABEL) as Nature[];


export const INSTITUTION_TYPE_LABEL = {
  BPD: "Badan Permusyawaratan Desa (BPD)",
  LPM: "Lembaga Pemberdayaan Masyarakat (LPM/LKD)",
  KARANG_TARUNA: "Karang Taruna",
  LAINNYA: "Lembaga lainnya",
} as const;
export type InstitutionType = keyof typeof INSTITUTION_TYPE_LABEL;
export const INSTITUTION_TYPES = Object.keys(INSTITUTION_TYPE_LABEL) as InstitutionType[];
export const isInstitutionType = (v: unknown): v is InstitutionType => typeof v === "string" && Object.prototype.hasOwnProperty.call(INSTITUTION_TYPE_LABEL, v);

export const ROLE_LABEL = { KETUA: "Ketua", WAKIL_KETUA: "Wakil ketua", SEKRETARIS: "Sekretaris", BENDAHARA: "Bendahara", ANGGOTA: "Anggota" } as const;
export type MemberRole = keyof typeof ROLE_LABEL;
export const MEMBER_ROLES = Object.keys(ROLE_LABEL) as MemberRole[];
export const ROLE_ORDER: Record<string, number> = { KETUA: 0, WAKIL_KETUA: 1, SEKRETARIS: 2, BENDAHARA: 3, ANGGOTA: 4 };

