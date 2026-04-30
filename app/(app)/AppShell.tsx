"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { isRegionalAccount } from "@/lib/regional-session";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Toaster } from "sonner";

// Map route keys to page metadata
const pageConfig = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Ringkasan informasi dan statistik desa",
  },
  profil: {
    title: "Profil Akun",
    subtitle: "Informasi pengguna yang sedang masuk",
  },
  "data-warga": {
    title: "Data Warga",
    subtitle: "Kelola data penduduk desa",
  },
  "data-kk": {
    title: "Data Kartu Keluarga",
    subtitle: "Kelola data kartu keluarga",
  },
  "data-perangkat": {
    title: "Data Perangkat Desa",
    subtitle: "Kelola data perangkat dan staf desa",
  },
  "data-jabatan": {
    title: "Data Jabatan",
    subtitle: "Kelola struktur jabatan perangkat desa",
  },
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
    subtitle: "Profil, anggota, dan buku kas (pencatatan internal)",
  },
  statistik: {
    title: "Statistik Kependudukan",
    subtitle: "Data statistik dan demografi desa",
  },
  "statistik/gender": {
    title: "Statistik Jenis Kelamin",
    subtitle: "Analisis distribusi jenis kelamin",
  },
  "statistik/pendidikan": {
    title: "Statistik Pendidikan",
    subtitle: "Analisis tingkat pendidikan",
  },
  "statistik/pekerjaan": {
    title: "Statistik Pekerjaan",
    subtitle: "Analisis jenis pekerjaan",
  },
  "permohonan-warga": {
    title: "Permohonan Warga",
    subtitle: "Kelola permohonan surat dari warga",
  },
  "layanan-mandiri": {
    title: "Layanan Mandiri",
    subtitle: "Konfigurasi kiosk layanan mandiri untuk warga",
  },
  "layanan-surat": {
    title: "Layanan Surat",
    subtitle: "Buat dan kelola template surat desa",
  },
  "pengaturan-desa": {
    title: "Pengaturan Desa",
    subtitle: "Profil desa, kontak, dan pengaturan kop surat",
  },
  layanan: {
    title: "Pelayanan Surat",
    subtitle: "Kelola permohonan surat dari warga",
  },
  keuangan: {
    title: "Sistem Keuangan Desa",
    subtitle: "Pengelolaan keuangan dan laporan",
  },
  billing: {
    title: "Billing",
    subtitle: "Kelola paket, invoice, dan pembayaran",
  },
  portal: {
    title: "Portal Warga",
    subtitle: "Kelola laporan dan pengaduan warga",
  },
  "pengumuman-desa": {
    title: "Pengumuman dan Berita Desa",
    subtitle: "Kelola pengumuman dan berita untuk warga",
  },
  "forum-diskusi": {
    title: "Forum Diskusi Warga",
    subtitle: "Platform diskusi dan komunikasi warga",
  },
  "pengaduan-masyarakat": {
    title: "Pengaduan Masyarakat",
    subtitle: "Kelola laporan dan pengaduan warga",
  },
  "bantuan-program-keluarga": {
    title: "Bantuan Sosial & Program Keluarga",
    subtitle: "Kelola program desa dan penerima untuk cek publik NIK",
  },
  "galeri-desa": {
    title: "Galeri Kegiatan Desa",
    subtitle: "Dokumentasi foto kegiatan dan pembangunan",
  },
  absensi: {
    title: "Absensi Perangkat",
    subtitle: "Monitoring kehadiran perangkat desa",
  },
  "absensi/check-in": {
    title: "Check-in Absensi",
    subtitle: "Catat kehadiran lewat QR desa",
  },
  arsip: {
    title: "Arsip Digital",
    subtitle: "Pengelolaan dokumen dan arsip desa",
  },
  ukm: {
    title: "Produk UKM",
    subtitle: "Katalog produk UMKM desa",
  },
  website: {
    title: "Website Desa",
    subtitle: "Kelola konten website desa (Coming Soon)",
  },
} as const;

type PageKey = keyof typeof pageConfig;

function derivePageKey(pathname: string): PageKey {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "dashboard";

  // Try two-level path first (e.g. statistik/gender)
  const twoLevel = segments.slice(0, 2).join("/") as PageKey;
  if (twoLevel in pageConfig) return twoLevel;

  // Fallback to first segment
  const oneLevel = segments[0] as PageKey;
  if (oneLevel in pageConfig) return oneLevel;

  return "dashboard";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status: sessionStatus } = useSession();

  const [activePage, setActivePage] = useState<PageKey>("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    setActivePage(derivePageKey(pathname));
  }, [pathname]);

  useEffect(() => {
    if (sessionStatus !== "authenticated" || !session?.user?.id) return;
    if (isRegionalAccount(session)) return;

    const current = pathname || "/";
    if (current.startsWith("/billing") || current.startsWith("/auth")) return;

    const check = async () => {
      try {
        const res = await fetch("/api/billing/status", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json().catch(() => null)) as {
          subscription?: { active?: unknown };
        } | null;
        if (!data?.subscription || typeof data.subscription.active !== "boolean") {
          return;
        }
        if (!data.subscription.active) {
          router.replace("/billing");
        }
      } catch {
        return;
      }
    };

    void check();
  }, [pathname, router, session, sessionStatus]);

  const { title, subtitle } = useMemo(
    () => pageConfig[activePage],
    [activePage],
  );

  const handlePageChange = (page: string) => {
    setActivePage(page as PageKey);
    const targetPath = page.startsWith("/") ? page : `/${page}`;
    router.push(targetPath);
  };

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
        <Header
          title={title}
          subtitle={subtitle}
          onMenuClick={() => setIsSidebarOpen(true)}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>

      <Toaster />
    </div>
  );
}
