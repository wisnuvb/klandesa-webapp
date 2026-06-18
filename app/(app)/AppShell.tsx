"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { isRegionalAccount } from "@/lib/regional-session";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { getModuleById } from "@/lib/modules/registry";
import { Toaster } from "sonner";
import { TrialBanner } from "@/components/app/TrialBanner";
import { LarasFab } from "@/components/ai/LarasFab";
import { shouldShowLarasFab } from "@/lib/ai/laras-access";
import { isOnboardingFlowPath } from "@/lib/onboarding";

// Map route keys to page metadata — urutan mengikuti sidebar & alur operasional desa
const pageConfig = {
  // --- Ringkasan ---
  dashboard: {
    title: "Dashboard",
    subtitle: "Ringkasan informasi dan statistik desa",
  },

  // --- Data master: Kependudukan ---
  "data-warga": {
    title: "Data Warga",
    subtitle: "Kelola data penduduk desa",
  },
  "data-kk": {
    title: "Kartu Keluarga",
    subtitle: "Kelola data kartu keluarga (KK)",
  },
  "data-perangkat": {
    title: "Perangkat Desa",
    subtitle: "Kelola data perangkat dan staf desa",
  },
  "data-jabatan": {
    title: "Struktur Jabatan",
    subtitle: "Kelola struktur jabatan perangkat desa",
  },

  // --- Data master: Profil & ekonomi ---
  potensi: {
    title: "Potensi Desa",
    subtitle: "Informasi potensi dan sumber daya desa",
  },
  anggaran: {
    title: "Anggaran Desa",
    subtitle: "Kelola anggaran dan realisasi keuangan desa",
  },
  koperasi: {
    title: "Koperasi Desa",
    subtitle: "Profil, anggota, dan buku kas koperasi",
  },
  bumdes: {
    title: "BUMDes",
    subtitle: "Unit usaha desa, pembukuan, dan laporan laba rugi",
  },
  statistik: {
    title: "Statistik Penduduk",
    subtitle: "Data statistik dan demografi kependudukan",
  },
  "statistik/gender": {
    title: "Statistik Jenis Kelamin",
    subtitle: "Analisis distribusi jenis kelamin",
  },
  "statistik/pendidikan": {
    title: "Statistik Pendidikan",
    subtitle: "Analisis tingkat pendidikan penduduk",
  },
  "statistik/pekerjaan": {
    title: "Statistik Pekerjaan",
    subtitle: "Analisis jenis pekerjaan penduduk",
  },

  // --- Operasional: Layanan surat ---
  "permohonan-warga": {
    title: "Antrian Permohonan",
    subtitle: "Kelola permohonan surat dari warga",
  },
  "layanan-mandiri": {
    title: "Kiosk Mandiri",
    subtitle: "Konfigurasi kiosk layanan mandiri untuk warga",
  },
  "layanan-surat": {
    title: "Template Surat",
    subtitle: "Buat dan kelola template surat desa",
  },
  keuangan: {
    title: "Keuangan Desa",
    subtitle: "Pencatatan keuangan, laporan, dan realisasi anggaran",
  },

  // --- Operasional: Portal warga ---
  "pengumuman-desa": {
    title: "Informasi",
    subtitle: "Kelola pengumuman dan berita untuk warga",
  },
  "forum-diskusi": {
    title: "Forum Diskusi",
    subtitle: "Platform diskusi dan komunikasi warga",
  },
  "pengaduan-masyarakat": {
    title: "Pengaduan Warga",
    subtitle: "Kelola laporan dan pengaduan masyarakat",
  },
  "bantuan-program-keluarga": {
    title: "Bansos & Program",
    subtitle: "Kelola program bantuan sosial dan penerima manfaat",
  },
  "galeri-desa": {
    title: "Galeri Kegiatan",
    subtitle: "Dokumentasi foto kegiatan dan pembangunan desa",
  },

  // --- Operasional: Program lapangan ---
  absensi: {
    title: "Absensi Perangkat",
    subtitle: "Monitoring kehadiran perangkat desa",
  },
  "absensi/check-in": {
    title: "Check-in Absensi",
    subtitle: "Catat kehadiran lewat QR desa",
  },
  pkk: {
    title: "PKK & Posyandu",
    subtitle: "Posyandu, dasawisma, dan monitoring kesehatan keluarga",
  },
  pertanian: {
    title: "Pertanian",
    subtitle: "Lahan, siklus tanam, panen, dan harga komoditas",
  },
  "partisipasi-rtrw": {
    title: "Kegiatan RT/RW",
    subtitle: "Gotong royong, kegiatan warga, dan usulan tingkat RT/RW",
  },
  lingkungan: {
    title: "Lingkungan Hidup",
    subtitle: "Bank sampah, insiden lingkungan, dan titik risiko bencana",
  },

  // --- Perencanaan & SDGs ---
  sdgs: {
    title: "Skor SDGs Desa",
    subtitle: "Skor 18 goal, heatmap RT/RW, dan integrasi data modul desa",
  },
  rpjmdes: {
    title: "RPJMDes",
    subtitle: "Perencanaan pembangunan, RKP, dan usulan Musdes",
  },

  // --- Peta & integrasi ---
  "sinkronisasi-data": {
    title: "Sinkronisasi Data",
    subtitle: "Integrasi data dengan sistem eksternal desa",
  },
  "peta-infrastruktur": {
    title: "Peta Infrastruktur",
    subtitle: "Aset, proyek, dan titik risiko bencana pada peta desa",
  },
  "asisten-ai": {
    title: "Asisten Desa AI",
    subtitle: "Asisten digital perangkat desa — SDGs, RPJMDes, dan layanan warga",
  },

  // --- Konten & promosi ---
  arsip: {
    title: "Arsip Digital",
    subtitle: "Pengelolaan dokumen dan arsip desa",
  },
  ukm: {
    title: "Katalog UMKM",
    subtitle: "Katalog produk UMKM desa",
  },
  // website: {
  //   title: "Website Desa",
  //   subtitle: "Kelola konten dan tampilan website desa",
  // },

  // --- Pengaturan & langganan ---
  "pengaturan-desa": {
    title: "Profil & Kop Surat",
    subtitle: "Profil desa, kontak, dan pengaturan kop surat",
  },
  billing: {
    title: "Langganan & Billing",
    subtitle: "Kelola paket langganan, invoice, dan pembayaran",
  },
  onboarding: {
    title: "Onboarding",
    subtitle: "Persiapan awal penggunaan Klandesa",
  },

  // --- Akun ---
  profil: {
    title: "Profil Akun",
    subtitle: "Informasi pengguna yang sedang masuk",
  },

  // --- Portal Mitra ---
  mitra: {
    title: "Dashboard Mitra",
    subtitle: "Ringkasan aktivitas dan prospek Anda",
  },
  "mitra/referral": {
    title: "Kode referral",
    subtitle: "Tautan kampanye Anda, ringkasan event dan lead inbound",
  },
  "mitra/prospek": {
    title: "Prospek Desa",
    subtitle: "Catat dan pantau status desa yang Anda prospek",
  },
  "mitra/desa": {
    title: "Desa Dikelola",
    subtitle: "Desa closing yang tertaut pada akun mitra Anda",
  },
  "mitra/komisi": {
    title: "Revenue & Komisi",
    subtitle: "Ringkasan bagi hasil, grafik menurut tipe, dan ledger komisi mitra",
  },
  "mitra/disbursment": {
    title: "Disbursement",
    subtitle: "Riwayat transfer komisi oleh platform ke rekening mitra",
  },
  "mitra/profil": {
    title: "Profil & Rekening",
    subtitle: "Data mitra, rekening komisi, dan ubah password login portal",
  },

  // --- Admin Platform ---
  admin: {
    title: "Admin Klandesa",
    subtitle: "Kelola desa, mitra, dan operasional platform",
  },
  "admin/desa": {
    title: "Kelola Desa",
    subtitle: "Daftar desa dan status berlangganan",
  },
  "admin/mitra": {
    title: "Kelola Mitra",
    subtitle:
      "Pendaftaran mitra, kode referral, akun dan bagi hasil (komisi & disbursement)",
  },
  "admin/blog": {
    title: "Kelola Blog",
    subtitle: "Buat dan publish artikel blog Klandesa",
  },

  // --- Alias legacy (route tidak aktif di sidebar) ---
  layanan: {
    title: "Pelayanan Surat",
    subtitle: "Kelola permohonan surat dari warga",
  },
  portal: {
    title: "Portal Warga",
    subtitle: "Kelola laporan dan pengaduan warga",
  },
} as const;

type PageKey = keyof typeof pageConfig;

function isKnownPageKey(key: string): key is PageKey {
  return key in pageConfig || getModuleById(key) != null;
}

function resolvePageMeta(pageId: string): { title: string; subtitle: string } {
  const known = pageConfig[pageId as PageKey];
  if (known) return known;

  const mod = getModuleById(pageId);
  if (mod) {
    return { title: mod.label, subtitle: `Modul ${mod.label}` };
  }

  return pageConfig.dashboard;
}

function derivePageKey(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "dashboard";

  // Try two-level path first (e.g. statistik/gender)
  const twoLevel = segments.slice(0, 2).join("/");
  if (isKnownPageKey(twoLevel)) return twoLevel;

  // Fallback to first segment
  const oneLevel = segments[0];
  if (isKnownPageKey(oneLevel)) return oneLevel;

  return "dashboard";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status: sessionStatus } = useSession();

  const [activePage, setActivePage] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [billingBanner, setBillingBanner] = useState<{
    phase: string;
    daysRemaining: number | null;
    writable: boolean;
    active: boolean;
    onboardingDone: boolean;
  } | null>(null);

  useEffect(() => {
    setActivePage(derivePageKey(pathname));
  }, [pathname]);

  useEffect(() => {
    if (sessionStatus !== "authenticated" || !session?.user?.id) return;
    if (
      isRegionalAccount(session) ||
      session.user.accountType === "partner" ||
      session.user.accountType === "platform"
    )
      return;

    const current = pathname || "/";
    if (current.startsWith("/auth")) return;

    const check = async () => {
      try {
        const res = await fetch("/api/billing/status", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json().catch(() => null)) as {
          subscription?: {
            active?: boolean;
            writable?: boolean;
            phase?: string;
            daysRemaining?: number | null;
          };
          village?: { onboardingCompletedAt?: string | null };
        } | null;
        const sub = data?.subscription;
        if (!sub || typeof sub.active !== "boolean") return;

        setBillingBanner({
          phase: String(sub.phase ?? "inactive"),
          daysRemaining: sub.daysRemaining ?? null,
          writable: sub.writable !== false,
          active: sub.active,
          onboardingDone: Boolean(data?.village?.onboardingCompletedAt),
        });

        if (!sub.active && !current.startsWith("/billing")) {
          router.replace("/billing");
          return;
        }

        if (
          sub.active &&
          !data?.village?.onboardingCompletedAt &&
          !isOnboardingFlowPath(current) &&
          !current.startsWith("/billing")
        ) {
          router.replace("/onboarding");
        }
      } catch {
        return;
      }
    };

    void check();
  }, [pathname, router, session, sessionStatus]);

  const { title, subtitle } = useMemo(
    () => resolvePageMeta(activePage),
    [activePage],
  );

  const handlePageChange = (page: string) => {
    setActivePage(page);
    const targetPath = page.startsWith("/") ? page : `/${page}`;
    router.push(targetPath);
  };

  const showLarasFab =
    sessionStatus === "authenticated" &&
    session?.user?.accountType !== "regional" &&
    session?.user?.accountType !== "partner" &&
    session?.user?.accountType !== "platform" &&
    shouldShowLarasFab(pathname);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        activePage={activePage}
        onPageChange={handlePageChange}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen((v) => !v)}
        isCollapsed={isSidebarCollapsed}
        onCollapse={() => setIsSidebarCollapsed((v) => !v)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {billingBanner && (
          <TrialBanner
            phase={billingBanner.phase}
            daysRemaining={billingBanner.daysRemaining}
            writable={billingBanner.writable}
          />
        )}
        <Header
          title={title}
          subtitle={subtitle}
          onMenuClick={() => setIsSidebarOpen(true)}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>

      {showLarasFab ? <LarasFab /> : null}
      <Toaster />
    </div>
  );
}
