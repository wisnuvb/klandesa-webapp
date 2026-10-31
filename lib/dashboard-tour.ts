import type { DriveStep } from "driver.js";

/** Event untuk memicu ulang tur saat user sudah berada di /dashboard. */
export const DASHBOARD_TOUR_REPLAY_EVENT = "klandesa:dashboard-tour:replay";

/** Flag sessionStorage: diset sebelum pindah ke /dashboard dari halaman lain, dibaca sekali lalu dihapus. */
export const DASHBOARD_TOUR_REPLAY_STORAGE_KEY = "klandesa:dashboard-tour:replay-pending";

const TOUR_VERSION = "v1";

/** Breakpoint `md` Tailwind — di bawah ini sidebar tersembunyi lewat transform, bukan dilepas dari DOM. */
const DESKTOP_NAV_QUERY = "(min-width: 768px)";

export function dashboardTourSeenKey(userId: string): string {
  return `klandesa:dashboard-tour:${TOUR_VERSION}:seen:${userId}`;
}

export function buildDashboardTourSteps(): DriveStep[] {
  const isDesktopNav =
    typeof window !== "undefined" && window.matchMedia(DESKTOP_NAV_QUERY).matches;

  const navStep: DriveStep = isDesktopNav
    ? {
        element: '[data-tour="nav-sidebar"]',
        popover: {
          title: "Menu navigasi",
          description:
            "Semua modul desa ada di sini — Data Warga, Surat, Keuangan, dan lainnya, dikelompokkan sesuai alur kerja desa.",
        },
      }
    : {
        element: '[data-tour="nav-menu-btn"]',
        popover: {
          title: "Menu navigasi",
          description: "Menu lengkap ada di balik ikon ini.",
        },
      };

  return [
    {
      popover: {
        title: "Selamat datang di Klandesa 👋",
        description: "Yuk kenalan singkat dengan dashboard — cuma 30 detik.",
      },
    },
    navStep,
    {
      element: '[data-tour="laras-card"]',
      popover: {
        title: "Laras, Asisten Desa AI",
        description:
          "Bisa bantu jawab pertanyaan dan kerjakan tugas administratif untuk Anda.",
      },
    },
    {
      element: '[data-tour="stats-grid"]',
      popover: {
        title: "Ringkasan angka desa",
        description:
          "Total warga, permohonan surat, perangkat, dan dana tersedia — otomatis update.",
      },
    },
    {
      element: '[data-tour="idm-card"]',
      popover: {
        title: "Status IDM & SDGs",
        description:
          "Pantau skor Indeks Desa Membangun dan SDGs langsung dari portal resmi pemerintah.",
      },
    },
    {
      element: '[data-tour="charts-activity"]',
      popover: {
        title: "Grafik & aktivitas terbaru",
        description:
          "Grafik demografi warga dan riwayat aktivitas terbaru di akun desa Anda.",
      },
    },
    {
      element: '[data-tour="quick-actions"]',
      popover: {
        title: "Aksi cepat",
        description:
          "Jalan pintas ke tugas yang paling sering dilakukan — tambah warga, buat surat, dan lainnya.",
      },
    },
    {
      element: '[data-tour="laras-fab"]',
      popover: {
        title: "Butuh bantuan?",
        description: "Klik ikon ini kapan saja untuk tanya Laras.",
      },
    },
    {
      popover: {
        title: "Selesai! 🎉",
        description:
          "Anda bisa ulangi tur ini lewat ikon tanda tanya di pojok kanan atas. Selamat bekerja!",
      },
    },
  ];
}
