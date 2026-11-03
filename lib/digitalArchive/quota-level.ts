/** Tingkat peringatan kuota Arsip Digital (berkas arsip + foto seluler berbayar). Murni, dipakai dashboard. */

export const STORAGE_WARN_RATIO = 0.8;

export type StorageLevel = "ok" | "warning" | "full";

export interface StorageUsageSummary {
  usedBytes: number;
  limitBytes: number;
  /** Bagian dari usedBytes yang berasal dari foto aplikasi warga (profil, laporan, iuran, UKM). */
  chargedMediaBytes: number;
  percent: number;
  level: StorageLevel;
}

export function storageLevel(usedBytes: number, limitBytes: number): StorageLevel {
  if (!(limitBytes > 0)) return usedBytes > 0 ? "full" : "ok";
  if (usedBytes >= limitBytes) return "full";
  return usedBytes >= limitBytes * STORAGE_WARN_RATIO ? "warning" : "ok";
}

export function summarizeStorage(archiveBytes: number, chargedMediaBytes: number, limitBytes: number): StorageUsageSummary {
  const charged = Math.max(0, chargedMediaBytes);
  const usedBytes = Math.max(0, archiveBytes) + charged;
  const percent = limitBytes > 0 ? Math.min(999, Math.round((usedBytes / limitBytes) * 100)) : usedBytes > 0 ? 100 : 0;
  return { usedBytes, limitBytes, chargedMediaBytes: charged, percent, level: storageLevel(usedBytes, limitBytes) };
}
