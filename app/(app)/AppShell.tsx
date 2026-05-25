"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { isRegionalAccount } from "@/lib/regional-session";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { getModuleById } from "@/lib/modules/registry";
import { Toaster } from "sonner";

// Map route keys to page metadata — urutan mengikuti sidebar & alur operasional desa
const pageConfig = {
  // --- Desa: Ringkasan ---
  dashboard: {
    title: "Dashboard",
    subtitle: "Ringkasan informasi dan statistik desa",
  },

  // --- Desa: Data & Kependudukan ---
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
  bumdes: {
    title: "BUMDes",
    subtitle: "Unit usaha desa, pembukuan, dan laporan laba rugi",
  },

  // --- Desa: Statistik ---
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

  // --- Desa: Pelayanan Surat ---
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

  // --- Desa: Keuangan ---
  keuangan: {
    title: "Sistem Keuangan Desa",
    subtitle: "Pengelolaan keuangan dan laporan",
  },
  billing: {
    title: "Billing",
    subtitle: "Kelola paket, invoice, dan pembayaran",
  },

  // --- Desa: Portal Warga ---
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

  // --- Desa: Operasional Perangkat ---
  absensi: {
    title: "Absensi Perangkat",
    subtitle: "Monitoring kehadiran perangkat desa",
  },
  "absensi/check-in": {
    title: "Check-in Absensi",
    subtitle: "Catat kehadiran lewat QR desa",
  },

  // --- Desa: Kesehatan, Perencanaan & SDGs ---
  pkk: {
    title: "PKK & Dasawisma",
    subtitle: "Posyandu, dasawisma, dan monitoring kesehatan keluarga",
  },
  sdgs: {
    title: "Dashboard SDGs Desa",
    subtitle: "Skor 18 goal, heatmap RT/RW, dan integrasi data modul desa",
  },
  rpjmdes: {
    title: "RPJMDes",
    subtitle: "Perencanaan pembangunan, RKP, dan usulan Musdes",
  },
  pertanian: {
    title: "Pertanian",
    subtitle: "Lahan, siklus tanam, panen, dan harga komoditas",
  },
  "partisipasi-rtrw": {
    title: "Partisipasi RT/RW",
    subtitle: "Kegiatan warga, gotong royong, dan usulan tingkat RT/RW",
  },

  // --- Desa: Integrasi, GIS & AI ---
  "sinkronisasi-data": {
    title: "Sinkronisasi Data",
    subtitle: "Integrasi data dengan sistem eksternal desa",
  },
  "peta-infrastruktur": {
    title: "Peta Infrastruktur",
    subtitle: "Aset, proyek, dan titik risiko bencana pada peta desa",
  },
  lingkungan: {
    title: "Lingkungan",
    subtitle: "Bank sampah, insiden lingkungan, dan titik risiko bencana",
  },
  "asisten-ai": {
    title: "Asisten AI",
    subtitle: "Bantuan AI untuk layanan warga, SDGs, dan perencanaan desa",
  },

  // --- Desa: Arsip & Promosi ---
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
    subtitle: "Kelola konten dan tampilan website desa",
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
    if (current.startsWith("/billing") || current.startsWith("/auth")) return;

    const check = async () => {
      try {
        const res = await fetch("/api/billing/status", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json().catch(() => null)) as {
          subscription?: { active?: unknown };
        } | null;
        if (
          !data?.subscription ||
          typeof data.subscription.active !== "boolean"
        ) {
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
    () => resolvePageMeta(activePage),
    [activePage],
  );

  const handlePageChange = (page: string) => {
    setActivePage(page);
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
