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
    label: "Asisten Desa AI",
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
    groupLabel: "Kependudukan",
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
    sortOrder: 102,
  },
  {
    id: "data-perangkat",
    label: "Perangkat Desa",
    path: "/data-perangkat",
    permission: "officials",
    sdgGoals: [16, 18],
    status: "live",
    group: "kependudukan",
    sortOrder: 103,
  },
  {
    id: "data-jabatan",
    label: "Struktur Jabatan",
    path: "/data-jabatan",
    permission: "officials",
    sdgGoals: [18],
    status: "live",
    group: "kependudukan",
    sortOrder: 104,
  },

  // --- Data master: Profil & ekonomi desa ---
  {
    id: "potensi",
    label: "Potensi Desa",
    path: "/potensi",
    permission: "potentials",
    sdgGoals: [2, 8, 15],
    status: "live",
    group: "profil-ekonomi",
    groupLabel: "Profil & Ekonomi Desa",
    sortOrder: 111,
  },
  {
    id: "anggaran",
    label: "Anggaran Desa",
    path: "/anggaran",
    permission: "anggaran",
    sdgGoals: [16, 17],
    status: "live",
    group: "profil-ekonomi",
    sortOrder: 112,
  },
  {
    id: "koperasi",
    label: "Koperasi Desa",
    path: "/koperasi",
    permission: "cooperative",
    sdgGoals: [8],
    status: "live",
    group: "profil-ekonomi",
    sortOrder: 113,
  },
  {
    id: "bumdes",
    label: "BUMDes",
    path: "/bumdes",
    permission: "bumdes",
    sdgGoals: [2, 8],
    status: "beta",
    group: "profil-ekonomi",
    sortOrder: 114,
    billingAddon: "bumdes",
  },
  {
    id: "statistik",
    label: "Statistik Penduduk",
    path: "/statistik",
    permission: "statistics",
    sdgGoals: [1, 4, 10],
    status: "live",
    sortOrder: 120,
  },

  // --- Operasional: Layanan surat ---
  {
    id: "permohonan-warga",
    label: "Antrian Permohonan",
    path: "/permohonan-warga",
    permission: "mail",
    sdgGoals: [16],
    status: "live",
    group: "layanan-surat",
    groupLabel: "Layanan Surat",
    sortOrder: 201,
  },
  {
    id: "layanan-mandiri",
    label: "Kiosk Mandiri",
    path: "/layanan-mandiri",
    permission: "mail",
    sdgGoals: [16],
    status: "live",
    group: "layanan-surat",
    sortOrder: 202,
  },
  {
    id: "layanan-surat",
    label: "Template Surat",
    path: "/layanan-surat",
    permission: "mail",
    sdgGoals: [16],
    status: "live",
    group: "layanan-surat",
    sortOrder: 203,
  },
  {
    id: "keuangan",
    label: "Keuangan Desa",
    path: "/keuangan",
    permission: "finance",
    sdgGoals: [16, 17],
    status: "live",
    sortOrder: 210,
  },

  // --- Operasional: Portal warga ---
  {
    id: "pengumuman-desa",
    label: "Pengumuman & Berita",
    path: "/pengumuman-desa",
    permission: "announcements",
    sdgGoals: [16],
    status: "live",
    group: "portal-warga",
    groupLabel: "Portal Warga",
    sortOrder: 301,
  },
  {
    id: "forum-diskusi",
    label: "Forum Diskusi",
    path: "/forum-diskusi",
    permission: "forum",
    sdgGoals: [16],
    status: "live",
    group: "portal-warga",
    sortOrder: 302,
  },
  {
    id: "pengaduan-masyarakat",
    label: "Pengaduan Warga",
    path: "/pengaduan-masyarakat",
    permission: "citizen_reports",
    sdgGoals: [16],
    status: "live",
    group: "portal-warga",
    sortOrder: 303,
  },
  {
    id: "bantuan-program-keluarga",
    label: "Bansos & Program",
    path: "/bantuan-program-keluarga",
    permission: "social_benefits",
    sdgGoals: [1, 10],
    status: "live",
    group: "portal-warga",
    sortOrder: 304,
  },
  {
    id: "galeri-desa",
    label: "Galeri Kegiatan",
    path: "/galeri-desa",
    permission: "announcements",
    sdgGoals: [16],
    status: "live",
    group: "portal-warga",
    sortOrder: 305,
  },

  // --- Operasional: Program lapangan ---
  {
    id: "absensi",
    label: "Absensi Perangkat",
    path: "/absensi",
    permission: "attendance",
    sdgGoals: [16],
    status: "live",
    group: "operasional",
    groupLabel: "Operasional Harian",
    sortOrder: 401,
  },
  {
    id: "pkk",
    label: "PKK & Posyandu",
    path: "/pkk",
    permission: "pkk",
    sdgGoals: [3, 5],
    status: "beta",
    group: "operasional",
    sortOrder: 402,
    billingAddon: "pkk",
  },
  {
    id: "pertanian",
    label: "Pertanian",
    path: "/pertanian",
    permission: "pertanian",
    sdgGoals: [2, 8, 15],
    status: "beta",
    group: "operasional",
    sortOrder: 403,
  },
  {
    id: "partisipasi-rtrw",
    label: "Kegiatan RT/RW",
    path: "/partisipasi-rtrw",
    permission: "rtrw",
    sdgGoals: [16, 17, 18],
    status: "beta",
    group: "operasional",
    sortOrder: 404,
  },
  {
    id: "lingkungan",
    label: "Lingkungan Hidup",
    path: "/lingkungan",
    permission: "lingkungan",
    sdgGoals: [6, 11, 12, 13, 15],
    status: "beta",
    group: "operasional",
    sortOrder: 405,
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
    groupLabel: "Perencanaan & SDGs",
    sortOrder: 501,
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
    sortOrder: 502,
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
    group: "integrasi",
    groupLabel: "Peta & Integrasi",
    sortOrder: 601,
    billingAddon: "gis",
  },
  {
    id: "sinkronisasi-data",
    label: "Sinkronisasi Data",
    path: "/sinkronisasi-data",
    permission: "integrations",
    sdgGoals: [17],
    status: "beta",
    group: "integrasi",
    sortOrder: 602,
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
    group: "promosi",
    groupLabel: "Konten & Promosi",
    sortOrder: 701,
  },
  {
    id: "ukm",
    label: "Katalog UMKM",
    path: "/ukm",
    permission: "ukm",
    sdgGoals: [8],
    status: "live",
    group: "promosi",
    sortOrder: 702,
  },
  {
    id: "website",
    label: "Website Desa",
    path: "/website",
    permission: "website",
    sdgGoals: [17],
    status: "live",
    group: "promosi",
    sortOrder: 703,
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
    id: "billing",
    label: "Langganan & Billing",
    path: "/billing",
    permission: "billing",
    sdgGoals: [],
    status: "live",
    group: "pengaturan",
    sortOrder: 902,
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
