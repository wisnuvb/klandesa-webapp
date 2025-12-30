"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Toaster } from "sonner";
import type { Session } from "next-auth";

// Map route keys to page metadata
const pageConfig = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Ringkasan informasi dan statistik desa",
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
  "layanan-surat": {
    title: "Layanan Surat",
    subtitle: "Buat dan kelola template surat desa",
  },
  layanan: {
    title: "Pelayanan Surat",
    subtitle: "Kelola permohonan surat dari warga",
  },
  keuangan: {
    title: "Sistem Keuangan Desa",
    subtitle: "Pengelolaan keuangan dan laporan",
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
  "galeri-desa": {
    title: "Galeri Kegiatan Desa",
    subtitle: "Dokumentasi foto kegiatan dan pembangunan",
  },
  absensi: {
    title: "Absensi Perangkat",
    subtitle: "Monitoring kehadiran perangkat desa",
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

export function AppShell({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [activePage, setActivePage] = useState<PageKey>("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    setActivePage(derivePageKey(pathname));
  }, [pathname]);

  const { title, subtitle } = useMemo(
    () => pageConfig[activePage],
    [activePage]
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
