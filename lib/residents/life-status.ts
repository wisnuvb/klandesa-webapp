import type { Prisma } from "@prisma/client";

/**
 * Status kehidupan warga untuk filter daftar Data Warga.
 *  - hidup: belum tercatat meninggal (yang sudah pindah tetap ada, sama dengan statistik kependudukan)
 *  - meninggal: tercatat meninggal
 *  - pindah: hidup tetapi sudah tercatat pindah dari desa
 *  - semua: tanpa penyaringan
 */
export const LIFE_STATUSES = ["hidup", "meninggal", "pindah", "semua"] as const;
export type LifeStatus = (typeof LIFE_STATUSES)[number];

export const LIFE_STATUS_LABEL: Record<LifeStatus, string> = {
  hidup: "Hidup",
  meninggal: "Meninggal",
  pindah: "Sudah pindah",
  semua: "Semua",
};

export const DEFAULT_LIFE_STATUS: LifeStatus = "hidup";

export const isLifeStatus = (v: unknown): v is LifeStatus => (LIFE_STATUSES as readonly unknown[]).includes(v);

/** Kosong/tidak ada → undefined (tanpa filter, perilaku lama bagi pemanggil lain); nilai asing → null (ditolak 400). */
export function parseLifeStatus(raw: string | null | undefined): LifeStatus | undefined | null {
  if (raw === null || raw === undefined || raw === "") return undefined;
  return isLifeStatus(raw) ? raw : null;
}

export function lifeStatusWhere(status: LifeStatus): Prisma.ResidentWhereInput {
  switch (status) {
    case "hidup":
      return { isAlive: true };
    case "meninggal":
      return { isAlive: false };
    case "pindah":
      return { isAlive: true, moveDate: { not: null } };
    default:
      return {};
  }
}
