import type { VillageRole } from "@/lib/permissions/client";

export const ROLE_LABELS: Record<VillageRole, string> = {
  admin: "Admin Desa",
  village_head: "Kepala Desa",
  secretary: "Sekretaris Desa",
  staff: "Staf Desa",
};

export const ROLE_DESCRIPTIONS: Record<VillageRole, string> = {
  admin: "Akses penuh, termasuk Langganan, Pengaturan, dan Akses Pengguna.",
  village_head: "Melihat semua modul dan menyetujui (keuangan, perencanaan, BLT, mutasi).",
  secretary: "Mengelola administrasi: warga, surat, arsip, perangkat, PKK.",
  staff: "Operator harian: mengelola data warga, surat, dan layanan. Tanpa Langganan dan Pengaturan.",
};
