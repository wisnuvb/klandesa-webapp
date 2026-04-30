import type { Metadata } from "next";
import { buildLandingSeo } from "@/lib/seo/landing";

export type LandingPageSeoKey =
  | "home"
  | "fitur"
  | "harga"
  | "harga-pangan"
  | "cek-bantuan-program"
  | "karir"
  | "demo";

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
};

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
