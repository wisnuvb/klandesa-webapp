import type { Metadata } from "next";
import { buildLandingSeo } from "@/lib/seo/landing";

export type LandingPageSeoKey =
  | "home"
  | "fitur"
  | "harga"
  | "harga-pangan"
  | "beasiswa"
  | "cek-bantuan-program"
  | "karir"
  | "demo"
  | "tim"
  | "mitra-klandesa"
  | "blog";

export type LandingPageSeoConfig = {
  pathname: string;
  title: string;
  description: string;
  keywords: string[];
  robots?: string;
};

const landingPageSeoMap: Record<LandingPageSeoKey, LandingPageSeoConfig> = {
  home: {
    pathname: "/",
    title: "Klandesa - Aplikasi Desa Digital Indonesia",
    description:
      "Platform digital untuk desa di Indonesia: administrasi, layanan masyarakat, keuangan, dan website desa dalam satu sistem yang efisien.",
    keywords: [
      "aplikasi desa",
      "digitalisasi desa",
      "sistem informasi desa",
      "administrasi desa",
      "layanan masyarakat desa",
      "website desa",
      "klandesa",
    ],
    robots: "index, follow",
  },
  fitur: {
    pathname: "/fitur",
    title:
      "Fitur Klandesa — Digitalisasi Desa: Data Warga, Surat, Keuangan & Portal",
    description:
      "Daftar fitur Klandesa: manajemen data penduduk, layanan surat online, sistem keuangan desa, portal warga, statistik & dashboard, website desa, absensi perangkat, arsip digital, UKM, dan notifikasi—platform all-in-one untuk administrasi desa.",
    keywords: [
      "fitur aplikasi desa",
      "sistem informasi desa",
      "layanan surat desa online",
      "keuangan desa digital",
      "portal warga desa",
      "dashboard statistik desa",
      "website desa",
      "arsip digital desa",
      "digitalisasi desa",
      "klandesa",
    ],
    robots: "index, follow",
  },
  harga: {
    pathname: "/harga",
    title: "Harga Klandesa - Paket Digitalisasi Desa",
    description:
      "Lihat paket Klandesa untuk kebutuhan desa: starter, profesional, hingga enterprise dengan dukungan implementasi dan pelatihan.",
    keywords: [
      "harga aplikasi desa",
      "paket sistem desa",
      "biaya digitalisasi desa",
      "paket klandesa",
    ],
    robots: "index, follow",
  },
  "harga-pangan": {
    pathname: "/harga-pangan",
    title: "Pantau Harga Pangan — Info Harga Bapok Rata-rata per Kab/Kota",
    description:
      "Cek harga rata-rata bahan pokok per kab/kota, bandingkan dengan periode sebelumnya, dan lihat referensi HET/HA. Sumber data: SP2KP Kemendag.",
    keywords: [
      "harga pangan",
      "harga bahan pokok",
      "harga sembako",
      "harga beras",
      "harga minyak goreng",
      "harga telur",
      "HET",
      "SP2KP",
      "kemendag",
      "klandesa",
    ],
    robots: "index, follow",
  },
  beasiswa: {
    pathname: "/beasiswa",
    title: "Info Beasiswa LPDP — Program yang Sedang Dibuka",
    description:
      "Lihat daftar program beasiswa LPDP yang sedang dibuka, termasuk ringkasan informasi, tenggat, serta filter dan pengurutan agar mudah menemukan yang sesuai.",
    keywords: [
      "beasiswa",
      "beasiswa LPDP",
      "pendaftaran beasiswa",
      "tenggat beasiswa",
      "beasiswa S2",
      "beasiswa S3",
      "klandesa",
    ],
    robots: "index, follow",
  },
  "cek-bantuan-program": {
    pathname: "/cek-bantuan-program",
    title:
      "Cek Bantuan Sosial & Program Keluarga — Catatan Desa & Arahan Resmi",
    description:
      "Cek ringkas status program yang dicatat Pemdes lewat Klandesa (tanpa nominal) dan temukan tautan resmi Kemensos untuk verifikasi bansos nasional.",
    keywords: [
      "cek bansos",
      "program keluarga",
      "BLT desa",
      "PKH",
      "Kemensos",
      "bantuan sosial",
      "klandesa",
    ],
    robots: "index, follow",
  },
  karir: {
    pathname: "/karir",
    title: "Karir & Kemitraan Klandesa",
    description:
      "Program kemitraan Klandesa untuk profesional dan komunitas yang ingin membantu digitalisasi layanan desa dengan skema kolaborasi yang jelas.",
    keywords: [
      "karir klandesa",
      "kemitraan desa",
      "partner digitalisasi desa",
      "program mitra desa",
    ],
    robots: "index, follow",
  },
  demo: {
    pathname: "/demo",
    title: "Demo Klandesa - Coba Simulasi Sistem Desa",
    description:
      "Akses akun demo Klandesa untuk mencoba alur administrasi desa, layanan warga, dan transparansi proses dalam satu dashboard.",
    keywords: [
      "demo aplikasi desa",
      "uji coba klandesa",
      "simulasi sistem desa",
      "demo layanan desa",
    ],
    robots: "index, follow",
  },
  tim: {
    pathname: "/tim",
    title: "Tim Klandesa — Founder & Orang di Balik Platform Desa Digital",
    description:
      "Kenali Wisnu Saputro, Boediman EP., dan Krina Wibisana — tim pendiri yang membangun Klandesa untuk digitalisasi layanan desa di Indonesia.",
    keywords: [
      "tim klandesa",
      "founder klandesa",
      "startup desa digital",
      "platform desa digital indonesia",
      "klandesa",
    ],
    robots: "index, follow",
  },
  "mitra-klandesa": {
    pathname: "/mitra-klandesa",
    title: "Program Mitra Klandesa — Kemitraan Digitalisasi Desa",
    description:
      "Bergabung sebagai mitra Klandesa: bagi hasil per closing, dukungan materi produk, dan fleksibilitas untuk konsultan desa, relasi pemda, atau komunitas yang memperkenalkan solusi digital desa.",
    keywords: [
      "mitra klandesa",
      "kemitraan digitalisasi desa",
      "partner aplikasi desa",
      "komisi mitra desa",
      "klandesa",
    ],
    robots: "index, follow",
  },
  blog: {
    pathname: "/blog",
    title: "Blog Klandesa — Artikel Digitalisasi Desa & Layanan Publik",
    description:
      "Artikel seputar digitalisasi desa, layanan publik, administrasi pemerintahan desa, dan perkembangan produk Klandesa.",
    keywords: [
      "blog klandesa",
      "artikel digitalisasi desa",
      "layanan publik desa",
      "sistem informasi desa",
      "klandesa",
    ],
    robots: "index, follow",
  },
};

/** Halaman legal yang diindeks (metadata didefinisikan di masing-masing page). */
export const LEGAL_SITEMAP_PATHS = [
  "/privacy-policy",
  "/terms-of-service",
  "/cookie-policy",
] as const;

const SITEMAP_PRIORITY: Partial<Record<string, number>> = {
  "/": 1,
  "/fitur": 0.9,
  "/harga": 0.9,
  "/harga-pangan": 0.85,
  "/beasiswa": 0.85,
  "/cek-bantuan-program": 0.85,
  "/demo": 0.85,
  "/mitra-klandesa": 0.8,
  "/karir": 0.8,
  "/tim": 0.75,
  "/blog": 0.8,
};

/** Entri statis marketing + legal untuk sitemap.xml */
export function listStaticMarketingSitemapRoutes(): Array<{
  pathname: string;
  priority: number;
  changeFrequency: "weekly" | "monthly";
}> {
  const marketing = Object.values(landingPageSeoMap).map((config) => ({
    pathname: config.pathname,
    priority: SITEMAP_PRIORITY[config.pathname] ?? 0.7,
    changeFrequency: "weekly" as const,
  }));

  const legal = LEGAL_SITEMAP_PATHS.map((pathname) => ({
    pathname,
    priority: 0.4,
    changeFrequency: "monthly" as const,
  }));

  return [...marketing, ...legal];
}

export function getLandingPageSeo(key: LandingPageSeoKey) {
  const config = landingPageSeoMap[key];
  const base = buildLandingSeo(config.pathname, config.title, config.description);

  return {
    ...base,
    keywords: config.keywords,
    robots: config.robots || "index, follow",
  };
}

/** Untuk export `metadata` di layout server (App Router). */
export function getLandingPageMetadata(key: LandingPageSeoKey): Metadata {
  const seo = getLandingPageSeo(key);
  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    robots: seo.robots,
    alternates: { canonical: seo.canonical },
    openGraph: {
      type: "website",
      locale: "id_ID",
      title: seo.title,
      description: seo.description,
      url: seo.canonical,
      images: [{ url: seo.ogImage }],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: [seo.ogImage],
    },
  };
}
