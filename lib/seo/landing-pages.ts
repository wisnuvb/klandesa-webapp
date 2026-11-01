import type { Metadata } from "next";
import { getMarketingModuleCountLabel } from "@/lib/marketing/modules";
import { buildLandingSeo } from "@/lib/seo/landing";

export type LandingPageSeoKey =
  | "home"
  | "platform"
  | "platformSdgs"
  | "platformIntegrasi"
  | "solusiDesa"
  | "solusiPemda"
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
  /** Judul sudah memuat merek: lewati template "%s | Klandesa" di root layout. */
  absoluteTitle?: boolean;
};

const landingPageSeoMap: Record<LandingPageSeoKey, LandingPageSeoConfig> = {
  home: {
    pathname: "/",
    title: "Klandesa — Aplikasi Desa Terpadu Berbasis SDGs",
    absoluteTitle: true,
    description:
      "Aplikasi desa terpadu: data warga, surat, APB Desa, Dana Desa, RKP Desa, SDGs, dan aplikasi seluler. Paket Lengkap Rp3,5 juta, trial gratis 14 hari.",
    keywords: [
      "aplikasi desa",
      "sistem informasi desa",
      "aplikasi administrasi desa",
      "aplikasi surat desa",
      "aplikasi APBDes",
      "aplikasi Dana Desa",
      "digitalisasi desa",
      "RPJMDes digital",
      "platform SDGs desa",
      "klandesa",
    ],
    robots: "index, follow",
  },
  platform: {
    pathname: "/platform",
    title: "Platform Klandesa — Modul Aplikasi Desa & SDGs",
    description:
      `Katalog ${getMarketingModuleCountLabel()} fitur aplikasi desa: data warga, surat, APB Desa, Dana Desa, perencanaan, SDGs, GIS, dan asisten AI. Modul Akses awal masih disempurnakan.`,
    keywords: [
      "modul aplikasi desa",
      "platform sdgs desa",
      "integrasi kemendesa",
      "rpjm des digital",
      "katalog klandesa",
    ],
    robots: "index, follow",
  },
  platformSdgs: {
    pathname: "/platform/sdgs",
    title: "Dashboard SDGs Desa — Skor 18 Tujuan & RPJMDes",
    description:
      "Gambaran Dashboard SDGs: skor dari data operasional, RPJMDes, tagging APBDes/kas, heatmap RT/RW—pendukung keputusan yang terpisah dari validasi hukum Kemendesa.",
    keywords: [
      "sdgs desa digital",
      "rpjm digital",
      "tagging APBDes SDGs",
      "klandesa",
    ],
    robots: "index, follow",
  },
  platformIntegrasi: {
    pathname: "/platform/integrasi",
    title: "Integrasi Kemendesa — Ekspor Penduduk & APBDes",
    description:
      "Adapter interoperability dengan export CSV/JSON, log audit, dan positioning jujur: bukan sync real-time tanpa akses resmi.",
    keywords: [
      "export kemendesa",
      "interop desa digital",
      "siskeudes csv",
      "prodeskel",
      "klandesa",
    ],
    robots: "index, follow",
  },
  solusiDesa: {
    pathname: "/solusi/desa",
    title: "Solusi untuk Desa — Operasional & SDGs",
    description:
      "Nilai bagi Kades, Sekdes, perangkat: administrasi satu login, PKK/BUMDes, heatmap pembangunan, dan early access untuk modul mutakhir.",
    keywords: ["aplikasi desa", "digitalisasi pemerintahan desa", "sdgs", "klandesa"],
    robots: "index, follow",
  },
  solusiPemda: {
    pathname: "/solusi/pemerintah-daerah",
    title: "Solusi untuk Pemda — Tata Kelola Lintas Desa",
    description:
      "Governance akses RBAC, export format interoperability, spasial pembangunan, akun wilayah—digitalisasi desa untuk skala kabupaten/kecamatan.",
    keywords: ["monitoring sdgs wilayah", "tata kelola aplikasi desa", "pemda", "klandesa"],
    robots: "index, follow",
  },
  harga: {
    pathname: "/harga",
    title: "Harga Paket Lengkap — Rp3,5 jt, Lalu Rp100 rb/bln",
    description:
      "Satu Paket Lengkap: Rp3.500.000 di awal (termasuk tahun pertama), lalu Rp100.000/bulan mulai tahun ke-2. Semua fitur terbuka, trial gratis 14 hari.",
    keywords: [
      "harga aplikasi desa",
      "harga klandesa",
      "paket lengkap klandesa",
      "aplikasi desa murah",
      "sistem informasi desa",
    ],
    robots: "index, follow",
  },
  "harga-pangan": {
    pathname: "/harga-pangan",
    title: "Pantau Harga Pangan per Kab/Kota",
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
    title: "Cek Bantuan Sosial & Program Keluarga Desa",
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
    title: "Karir & Kemitraan",
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
    title: "Demo — Coba Simulasi Sistem Desa",
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
    title: "Tim — Founder di Balik Platform Desa Digital",
    description:
      "Kenali Wisnu Saputro, founder Klandesa yang membangun platform digitalisasi layanan desa di Indonesia.",
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
    title: "Program Mitra — Kemitraan Digitalisasi Desa",
    description:
      "Jadi mitra Klandesa: bagi hasil per closing, materi produk, dan fleksibel untuk konsultan desa, relasi pemda, atau komunitas.",
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
    title: "Blog — Digitalisasi Desa & Layanan Publik",
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
  "/platform": 0.95,
  "/harga": 0.9,
  "/solusi/desa": 0.82,
  "/solusi/pemerintah-daerah": 0.82,
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
  const absolute = landingPageSeoMap[key].absoluteTitle === true;
  // OG/Twitter tidak melewati template layout, jadi merek ditambahkan di sini.
  const shareTitle = absolute ? seo.title : `${seo.title} | Klandesa`;
  return {
    title: absolute ? { absolute: seo.title } : seo.title,
    description: seo.description,
    keywords: seo.keywords,
    robots: seo.robots,
    alternates: { canonical: seo.canonical },
    openGraph: {
      type: "website",
      locale: "id_ID",
      siteName: "Klandesa",
      title: shareTitle,
      description: seo.description,
      url: seo.canonical,
      images: [{ url: seo.ogImage }],
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description: seo.description,
      images: [seo.ogImage],
    },
  };
}
