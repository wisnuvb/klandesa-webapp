/**
 * Istilah Padat Karya Tunai Desa (PKTD). Murni (tanpa Prisma), aman untuk klien.
 * Sumber [V]: Permendesa PDT 16/2025 Pasal 4 ayat 2 dan Lampiran II.F. Angka batas (upah minimal) ada di lib/dana-desa/rules.ts.
 */

/** Kelompok pekerja yang diprioritaskan (Lampiran II.F.3) dan kelompok inklusif (II.F.2.a). */
export const PRIORITIES = {
  PENGANGGUR: { label: "Penganggur", priority: true },
  SETENGAH_PENGANGGUR: { label: "Setengah penganggur", priority: true },
  PEREMPUAN_KK: { label: "Perempuan kepala keluarga", priority: true },
  KELUARGA_MISKIN: { label: "Anggota keluarga miskin", priority: true },
  MARGINAL: { label: "Masyarakat marginal lainnya", priority: true },
  DISABILITAS: { label: "Penyandang disabilitas", priority: true },
  LAINNYA: { label: "Lainnya", priority: false },
} as const;
export type Priority = keyof typeof PRIORITIES;
export const isPriority = (v: unknown): v is Priority => typeof v === "string" && v in PRIORITIES;

/** Jenis pekerjaan; semuanya dihitung sebagai upah (Lampiran II.F.5.b). */
export const TASKS = {
  PELAKSANAAN: "Pelaksanaan pembangunan",
  ANGKUT_MATERIAL: "Mengangkut bahan material",
  PENYIAPAN_LOKASI: "Menyiapkan lokasi",
  LAINNYA: "Lainnya",
} as const;
export type Task = keyof typeof TASKS;
export const isTask = (v: unknown): v is Task => typeof v === "string" && v in TASKS;

export const STATUS = { AKTIF: "Berjalan", SELESAI: "Selesai" } as const;
export type ActivityStatus = keyof typeof STATUS;

export const LIMITS = { workersPerActivity: 1000, entriesPerRequest: 200, activitiesPerYear: 200, daysPerActivity: 20000, residentSearch: 20 } as const;
