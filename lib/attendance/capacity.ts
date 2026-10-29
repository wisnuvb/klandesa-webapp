/**
 * Kapasitas absensi per paket desa. Murni (tanpa DB) agar dipakai bersama oleh route web, route seluler, dan tes.
 * Paket Lengkap: 10 perangkat desa dengan riwayat 30 hari (keputusan pemilik 2026-10-29, tercantum di /harga).
 */
import { isLengkapPlan } from "@/lib/billing/lengkap";

export type AttendanceTier =
  | "FREE"
  | "TIER_6_10"
  | "TIER_11_20"
  | "TIER_21_30"
  | "TIER_31_50"
  | "CUSTOM";

export function mapVillagePlanToTier(plan: string | null | undefined): AttendanceTier {
  const value = (plan ?? "").toLowerCase();
  if (value === "enterprise") return "TIER_31_50";
  if (value === "profesional" || value === "professional") return "TIER_11_20";
  if (value === "starter" || value === "lengkap") return "TIER_6_10";
  return "FREE";
}

export function staffLimitForTier(tier: AttendanceTier): number {
  if (tier === "FREE") return 5;
  if (tier === "TIER_6_10") return 10;
  if (tier === "TIER_11_20") return 20;
  if (tier === "TIER_21_30") return 30;
  if (tier === "TIER_31_50") return 50;
  return 50;
}

export function maxHistoryDaysForTier(tier: AttendanceTier): number {
  if (tier === "FREE") return 7;
  if (tier === "TIER_6_10") return 30;
  if (tier === "TIER_11_20") return 90;
  if (tier === "TIER_21_30") return 180;
  if (tier === "TIER_31_50") return 365;
  return 365;
}

/**
 * Batas absen dipaksakan di check-in hanya untuk Paket Lengkap (janji baru di /harga).
 * Desa paket lama tetap seperti sebelumnya: batas hanya memotong daftar di tabel web.
 */
export function attendanceCapacityEnforced(plan: string | null | undefined): boolean {
  return isLengkapPlan(plan);
}

export function staffLimitForPlan(plan: string | null | undefined): number {
  return staffLimitForTier(mapVillagePlanToTier(plan));
}

/** Pesan untuk perangkat yang absennya ditolak karena kapasitas desa penuh. */
export function attendanceCapacityFullMessage(limit: number): string {
  return `Kapasitas absensi desa (${limit} perangkat) sudah penuh, sehingga absen Anda belum bisa dicatat. Minta admin desa menghubungi Klandesa untuk menambah kapasitas.`;
}

/** Pesan untuk admin di halaman absensi Paket Lengkap bila perangkat aktif melebihi kapasitas. */
export function attendanceCapacityAdminMessage(limit: number, hiddenCount: number): string {
  const rest = hiddenCount > 0 ? ` ${hiddenCount} perangkat lainnya belum bisa memakai absensi.` : "";
  return `Paket Lengkap mencakup absensi untuk ${limit} perangkat desa.${rest} Hubungi Klandesa untuk menambah kapasitas.`;
}
