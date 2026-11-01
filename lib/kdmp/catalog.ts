/**
 * Istilah dukungan Koperasi Desa Merah Putih (KDMP). Murni (tanpa Prisma), aman untuk klien.
 * Sumber [V]: PMK 7/2026 Pasal 15 ayat 3 (pagu 58,03%), Pasal 20 ayat 3 (angsuran gerai, pergudangan, kelengkapan), Pasal 22 ayat 4
 * (penyaluran terpisah); Permendesa PDT 16/2025 Pasal 2 ayat 2 (dianggarkan dalam perubahan APB Desa). Persentase pagu ada di lib/dana-desa/rules.ts.
 */

export const KINDS = {
  GERAI: "Gerai",
  GUDANG: "Pergudangan",
  KELENGKAPAN: "Kelengkapan",
  LAINNYA: "Lainnya",
} as const;
export type Kind = keyof typeof KINDS;
export const isKind = (v: unknown): v is Kind => typeof v === "string" && v in KINDS;

export const STATUS = {
  RENCANA: "Belum dibangun",
  PEMBANGUNAN: "Dalam pembangunan",
  SELESAI: "Selesai dibangun",
  BEROPERASI: "Beroperasi",
} as const;
export type FacilityStatus = keyof typeof STATUS;

export const LIMITS = { disbursementsPerYear: 60, installmentsPerYear: 600, facilitiesPerYear: 50, progressPerFacility: 200 } as const;
