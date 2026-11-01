import type { PermissionResource } from "@/lib/permissions";

export type ModuleStatus = "live" | "beta" | "planned";

export type ModuleDefinition = {
  id: string;
  label: string;
  path?: string;
  permission: PermissionResource;
  sdgGoals: number[];
  status: ModuleStatus;
  /** ID menu parent untuk grouping sidebar */
  group?: string;
  groupLabel?: string;
  sortOrder: number;
  billingAddon?: string;
};

/** Registry modul desa — live + planned. Sidebar & landing baca dari sini. */
export const VILLAGE_MODULE_REGISTRY: ModuleDefinition[] = [
  // --- Ringkasan ---
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/dashboard",
    permission: "statistics",
    sdgGoals: [17],
    status: "live",
    sortOrder: 10,
  },
  {
    id: "asisten-ai",
    label: "Asisten AI",
    path: "/asisten-ai",
    permission: "ai_assistant",
    sdgGoals: [17],
    status: "beta",
    sortOrder: 15,
    billingAddon: "ai_assistant",
  },

  // --- Data master: Kependudukan ---
  {
    id: "data-warga",
    label: "Data Warga",
    path: "/data-warga",
    permission: "residents",
    sdgGoals: [1, 4, 10, 18],
    status: "live",
    group: "kependudukan",
    groupLabel: "Penduduk",
    sortOrder: 101,
  },
  {
    id: "data-kk",
    label: "Kartu Keluarga",
    path: "/data-kk",
    permission: "residents",
    sdgGoals: [1, 10],
    status: "live",
    group: "kependudukan",
    groupLabel: "Penduduk",
    sortOrder: 102,
  },
  {
    id: "data-perangkat",
    label: "Perangkat Desa",
    path: "/data-perangkat",
    permission: "officials",
    sdgGoals: [16, 18],
    status: "live",
    group: "pemerintahan",
    groupLabel: "Pemerintahan",
    sortOrder: 201,
  },
  {
    id: "data-jabatan",
    label: "Struktur Jabatan",
    path: "/data-jabatan",
    permission: "officials",
    sdgGoals: [18],
    status: "live",
    group: "pemerintahan",
    groupLabel: "Pemerintahan",
    sortOrder: 202,
  },

  // --- Data master: Profil & ekonomi desa ---
  {
    id: "potensi",
    label: "Potensi Desa",
    path: "/potensi",
    permission: "potentials",
    sdgGoals: [2, 8, 15],
    status: "live",
    group: "ekonomi",
    groupLabel: "Ekonomi & Potensi",
    sortOrder: 401,
  },
  {
    id: "anggaran",
    label: "Anggaran Desa",
    path: "/anggaran",
    permission: "anggaran",
    sdgGoals: [16, 17],
    status: "live",
    group: "perencanaan",
    groupLabel: "Perencanaan & Peta",
    sortOrder: 702,
  },
  {
    id: "koperasi",
    label: "Koperasi Desa",
    path: "/koperasi",
    permission: "cooperative",
    sdgGoals: [8],
    status: "live",
    group: "ekonomi",
    groupLabel: "Ekonomi & Potensi",
    sortOrder: 403,
  },
  {
    id: "bumdes",
    label: "BUMDes",
    path: "/bumdes",
    permission: "bumdes",
    sdgGoals: [2, 8],
    status: "beta",
    group: "ekonomi",
    groupLabel: "Ekonomi & Potensi",
    sortOrder: 402,
    billingAddon: "bumdes",
  },
  {
    id: "statistik",
    label: "Statistik Penduduk",
    path: "/statistik",
    permission: "statistics",
    sdgGoals: [1, 4, 10],
    status: "live",
    group: "kependudukan",
    groupLabel: "Penduduk",
    sortOrder: 103,
  },

  // --- Operasional: Layanan surat ---
  {
    id: "permohonan-warga",
    label: "Permohonan Warga",
    path: "/permohonan-warga",
    permission: "mail",
    sdgGoals: [16],
    status: "live",
    group: "surat-arsip",
    groupLabel: "Surat & Arsip",
    sortOrder: 301,
  },
  {
    id: "layanan-mandiri",
    label: "Kiosk Mandiri",
    path: "/layanan-mandiri",
    permission: "mail",
    sdgGoals: [16],
    status: "live",
    group: "surat-arsip",
    groupLabel: "Surat & Arsip",
    sortOrder: 302,
  },
  {
    id: "layanan-surat",
    label: "Buat Surat",
    path: "/layanan-surat",
    permission: "mail",
    sdgGoals: [16],
    status: "live",
    group: "surat-arsip",
    groupLabel: "Surat & Arsip",
    sortOrder: 303,
  },
  {
    id: "keuangan",
    label: "Keuangan Desa",
    path: "/keuangan",
    permission: "finance",
    sdgGoals: [16, 17],
    status: "live",
    sortOrder: 350,
  },
  {
    id: "laporan-kades",
    label: "Laporan Kepala Desa",
    path: "/laporan-kepala-desa",
    permission: "apbdes",
    sdgGoals: [16],
    status: "beta",
    sortOrder: 352,
  },
  {
    id: "apbdes",
    label: "APBDes & Buku Kas",
    path: "/apbdes",
    permission: "apbdes",
    sdgGoals: [16, 17],
    status: "beta",
    sortOrder: 351,
  },

  // --- Operasional: Portal warga ---
  {
    id: "pengumuman-desa",
    label: "Pengumuman",
    path: "/pengumuman-desa",
    permission: "announcements",
    sdgGoals: [16],
    status: "live",
    group: "komunikasi",
    groupLabel: "Komunikasi Warga",
    sortOrder: 501,
  },
  {
    id: "forum-diskusi",
    label: "Forum Diskusi",
    path: "/forum-diskusi",
    permission: "forum",
    sdgGoals: [16],
    status: "live",
    group: "komunikasi",
    groupLabel: "Komunikasi Warga",
    sortOrder: 502,
  },
  {
    id: "pengaduan-masyarakat",
    label: "Pengaduan Warga",
    path: "/pengaduan-masyarakat",
    permission: "citizen_reports",
    sdgGoals: [16],
    status: "live",
    group: "komunikasi",
    groupLabel: "Komunikasi Warga",
    sortOrder: 503,
  },
  {
    id: "bantuan-program-keluarga",
    label: "Bansos & Program",
    path: "/bantuan-program-keluarga",
    permission: "social_benefits",
    sdgGoals: [1, 10],
    status: "live",
    group: "program",
    groupLabel: "Program Desa",
    sortOrder: 601,
  },
  {
    id: "dtsen-usulan",
    label: "Usulan DTSEN",
    path: "/dtsen",
    permission: "dtsen_usulan",
    sdgGoals: [1, 10],
    status: "beta",
    group: "program",
    groupLabel: "Program Desa",
    sortOrder: 602,
  },
  {
    id: "galeri-desa",
    label: "Galeri Kegiatan",
    path: "/galeri-desa",
    permission: "announcements",
    sdgGoals: [16],
    status: "live",
    group: "komunikasi",
    groupLabel: "Komunikasi Warga",
    sortOrder: 504,
  },

  // --- Tata kelola pemerintahan desa ---
  {
    id: "produk-hukum",
    label: "Produk Hukum Desa",
    path: "/produk-hukum",
    permission: "produk_hukum",
    sdgGoals: [16],
    status: "beta",
    group: "pemerintahan",
    groupLabel: "Pemerintahan",
    sortOrder: 204,
  },
  {
    id: "register-surat",
    label: "Register Surat",
    path: "/register-surat",
    permission: "register_surat",
    sdgGoals: [16],
    status: "beta",
    group: "pemerintahan",
    groupLabel: "Pemerintahan",
    sortOrder: 205,
  },
  {
    id: "lembaga-desa",
    label: "Lembaga Desa (BPD, LPM)",
    path: "/lembaga-desa",
    permission: "lembaga_desa",
    sdgGoals: [16],
    status: "beta",
    group: "pemerintahan",
    groupLabel: "Pemerintahan",
    sortOrder: 206,
  },

  // --- Operasional: Program lapangan ---
  {
    id: "absensi",
    label: "Absensi Perangkat",
    path: "/absensi",
    permission: "attendance",
    sdgGoals: [16],
    status: "live",
    group: "pemerintahan",
    groupLabel: "Pemerintahan",
    sortOrder: 203,
  },
  {
    id: "pkk",
    label: "PKK & Posyandu",
    path: "/pkk",
    permission: "pkk",
    sdgGoals: [3, 5],
    status: "beta",
    group: "program",
    groupLabel: "Program Desa",
    sortOrder: 602,
    billingAddon: "pkk",
  },
  {
    id: "pertanian",
    label: "Pertanian",
    path: "/pertanian",
    permission: "pertanian",
    sdgGoals: [2, 8, 15],
    status: "beta",
    group: "program",
    groupLabel: "Program Desa",
    sortOrder: 603,
  },
  {
    id: "partisipasi-rtrw",
    label: "Kegiatan RT/RW",
    path: "/partisipasi-rtrw",
    permission: "rtrw",
    sdgGoals: [16, 17, 18],
    status: "beta",
    group: "program",
    groupLabel: "Program Desa",
    sortOrder: 604,
  },
  {
    id: "lingkungan",
    label: "Lingkungan Hidup",
    path: "/lingkungan",
    permission: "lingkungan",
    sdgGoals: [6, 11, 12, 13, 15],
    status: "beta",
    group: "program",
    groupLabel: "Program Desa",
    sortOrder: 605,
  },

  // --- Perencanaan & SDGs ---
  {
    id: "sdgs",
    label: "Skor SDGs Desa",
    path: "/sdgs",
    permission: "sdgs",
    sdgGoals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
    status: "beta",
    group: "perencanaan",
    groupLabel: "Perencanaan & Peta",
    sortOrder: 703,
    billingAddon: "sdgs",
  },
  {
    id: "rpjmdes",
    label: "RPJMDes",
    path: "/rpjmdes",
    permission: "rpjmdes",
    sdgGoals: [17, 18],
    status: "beta",
    group: "perencanaan",
    groupLabel: "Perencanaan & Peta",
    sortOrder: 701,
    billingAddon: "sdgs",
  },

  // --- Peta & integrasi ---
  {
    id: "peta-infrastruktur",
    label: "Peta Infrastruktur",
    path: "/peta-infrastruktur",
    permission: "gis",
    sdgGoals: [9, 11, 13],
    status: "beta",
    group: "perencanaan",
    groupLabel: "Perencanaan & Peta",
    sortOrder: 704,
    billingAddon: "gis",
  },
  {
    id: "aset-desa",
    label: "Aset Desa",
    path: "/aset-desa",
    permission: "aset_desa",
    sdgGoals: [16],
    status: "beta",
    group: "perencanaan",
    groupLabel: "Perencanaan & Peta",
    sortOrder: 705,
  },
  {
    id: "musdes",
    label: "Musyawarah Desa",
    path: "/musdes",
    permission: "perencanaan",
    sdgGoals: [16],
    status: "beta",
    group: "perencanaan",
    groupLabel: "Perencanaan & Peta",
    sortOrder: 706,
  },
  {
    id: "rkpdes",
    label: "Siklus RKP Desa",
    path: "/rkpdes",
    permission: "perencanaan",
    sdgGoals: [16, 17],
    status: "beta",
    group: "perencanaan",
    groupLabel: "Perencanaan & Peta",
    sortOrder: 707,
  },
  {
    id: "sinkronisasi-data",
    label: "Sinkronisasi Data",
    path: "/sinkronisasi-data",
    permission: "integrations",
    sdgGoals: [17],
    status: "beta",
    group: "pengaturan",
    groupLabel: "Pengaturan",
    sortOrder: 902,
    billingAddon: "integrations",
  },

  // --- Konten & promosi ---
  {
    id: "arsip",
    label: "Arsip Digital",
    path: "/arsip",
    permission: "archive",
    sdgGoals: [16],
    status: "live",
    group: "surat-arsip",
    groupLabel: "Surat & Arsip",
    sortOrder: 304,
  },
  {
    id: "ukm",
    label: "Katalog UMKM",
    path: "/ukm",
    permission: "ukm",
    sdgGoals: [8],
    status: "live",
    group: "ekonomi",
    groupLabel: "Ekonomi & Potensi",
    sortOrder: 404,
  },
  {
    id: "website",
    label: "Website Desa",
    path: "/website",
    permission: "website",
    sdgGoals: [17],
    status: "live",
    group: "komunikasi",
    groupLabel: "Komunikasi Warga",
    sortOrder: 505,
  },

  {
    id: "polling",
    label: "Polling Warga",
    path: "/polling",
    permission: "polls",
    sdgGoals: [16],
    status: "beta",
    group: "komunikasi",
    groupLabel: "Komunikasi Warga",
    sortOrder: 506,
  },

  // --- Pengaturan & langganan (bawah) ---
  {
    id: "pengaturan-desa",
    label: "Profil & Kop Surat",
    path: "/pengaturan-desa",
    permission: "settings",
    sdgGoals: [18],
    status: "live",
    group: "pengaturan",
    groupLabel: "Pengaturan",
    sortOrder: 901,
  },
  {
    id: "data-kustom",
    label: "Data Kustom",
    path: "/data-kustom",
    permission: "custom_data",
    sdgGoals: [17],
    status: "beta",
    group: "pengaturan",
    groupLabel: "Pengaturan",
    sortOrder: 904,
  },
  {
    id: "billing",
    label: "Langganan & Billing",
    path: "/billing",
    permission: "billing",
    sdgGoals: [],
    status: "live",
    group: "pengaturan",
    groupLabel: "Pengaturan",
    sortOrder: 903,
  },
];

export function getNavModules(): ModuleDefinition[] {
  return VILLAGE_MODULE_REGISTRY.filter(
    (m) => m.status === "live" || m.status === "beta",
  );
}

/** @deprecated Gunakan getNavModules */
export function getLiveModules(): ModuleDefinition[] {
  return getNavModules();
}

export function getModuleById(id: string): ModuleDefinition | undefined {
  return VILLAGE_MODULE_REGISTRY.find((m) => m.id === id);
}

/**
 * Modul berdasarkan segmen URL pertama (mis. "dtsen" → modul `dtsen-usulan`).
 * `id` dan `path` tidak selalu sama, jadi jangan membangun URL dari `id`.
 */
export function getModuleByPathSegment(segment: string): ModuleDefinition | undefined {
  if (!segment) return undefined;
  return VILLAGE_MODULE_REGISTRY.find(
    (m) => m.path?.split("/").filter(Boolean)[0] === segment,
  );
}

/** URL tujuan untuk id menu; id yang bukan modul dianggap sudah berupa path. */
export function resolveModulePath(idOrPath: string): string {
  if (idOrPath.startsWith("/")) return idOrPath;
  return getModuleById(idOrPath)?.path ?? `/${idOrPath}`;
}
