import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Building2,
  FileDown,
  GraduationCap,
  Handshake,
  HeartHandshake,
  Info,
  Landmark,
  LayoutGrid,
  MessageCircle,
  Newspaper,
  PlayCircle,
  ShoppingBasket,
  Smartphone,
  Target,
  Users,
} from "lucide-react";

import { LENGKAP_SETUP_FEE } from "@/lib/billing/lengkap";

export type NavLink = {
  title: string;
  /** Satu kalimat; tampil di panel menu dan di menu seluler. */
  desc: string;
  href: string;
  icon: LucideIcon;
};

/** Kartu sorotan di sisi kanan panel. `action: "register"` membuka modal daftar (bukan tautan). */
export type NavFeature =
  | { kind: "link"; eyebrow: string; title: string; desc: string; href: string; cta: string }
  | { kind: "register"; eyebrow: string; title: string; desc: string; cta: string };

export type NavGroup = {
  id: string;
  label: string;
  links: NavLink[];
  feature?: NavFeature;
};

export type NavItem = { type: "group"; group: NavGroup } | { type: "link"; label: string; href: string };

const rupiahJuta = `Rp${(LENGKAP_SETUP_FEE / 1_000_000).toLocaleString("id-ID")} juta`;

/**
 * Tautan hash memakai bentuk "/#id" agar bekerja dari halaman mana pun dan tetap berupa <a href> yang bisa di-crawl.
 * Setiap href di sini harus ada di app/(landing) (tes: tests/navbar-data.test.ts).
 */
export const NAV_ITEMS: NavItem[] = [
  {
    type: "group",
    group: {
      id: "solusi",
      label: "Solusi",
      links: [
        {
          title: "Untuk Desa",
          desc: "Surat, keuangan, perencanaan, dan SDGs dalam satu aplikasi.",
          href: "/solusi/desa",
          icon: Building2,
        },
        {
          title: "Untuk Pemerintah Daerah",
          desc: "Pantau banyak desa dan rekap kepatuhan laporan.",
          href: "/solusi/pemerintah-daerah",
          icon: Landmark,
        },
        {
          title: "Program Mitra",
          desc: "Bantu desa go digital dan dapatkan bagi hasil.",
          href: "/mitra-klandesa",
          icon: Handshake,
        },
      ],
      feature: {
        kind: "register",
        eyebrow: "Mulai tanpa risiko",
        title: "Coba gratis 14 hari",
        desc: "Semua fitur terbuka, tanpa bayar di muka.",
        cta: "Daftar sekarang",
      },
    },
  },
  {
    type: "group",
    group: {
      id: "platform",
      label: "Platform",
      links: [
        {
          title: "Semua fitur",
          desc: "Katalog lengkap, dari data warga sampai Dana Desa.",
          href: "/platform",
          icon: LayoutGrid,
        },
        {
          title: "Aplikasi seluler",
          desc: "Satu aplikasi untuk warga, RT, dan perangkat desa.",
          href: "/#aplikasi-seluler",
          icon: Smartphone,
        },
        {
          title: "SDGs & RPJMDes",
          desc: "Skor 18 tujuan dihitung dari data desa.",
          href: "/platform/sdgs",
          icon: Target,
        },
        {
          title: "Integrasi Kemendesa",
          desc: "Unduhan format standar beserta riwayatnya.",
          href: "/platform/integrasi",
          icon: FileDown,
        },
        {
          title: "Demo langsung",
          desc: "Coba akun demo tanpa perlu mendaftar.",
          href: "/demo",
          icon: PlayCircle,
        },
      ],
      feature: {
        kind: "link",
        eyebrow: "Paket Lengkap",
        title: `${rupiahJuta}, sudah termasuk tahun pertama`,
        desc: "Semua fitur terbuka. Mulai tahun ke-2 Rp100 ribu per bulan.",
        href: "/harga",
        cta: "Lihat harga",
      },
    },
  },
  { type: "link", label: "Harga", href: "/harga" },
  {
    type: "group",
    group: {
      id: "layanan-publik",
      label: "Layanan Publik",
      links: [
        {
          title: "Beasiswa",
          desc: "Program LPDP yang sedang dibuka beserta tenggatnya.",
          href: "/beasiswa",
          icon: GraduationCap,
        },
        {
          title: "Harga Pangan",
          desc: "Harga bahan pokok rata-rata per kabupaten/kota.",
          href: "/harga-pangan",
          icon: ShoppingBasket,
        },
        {
          title: "Cek Bansos & Program",
          desc: "Cek program yang dicatat desa dan tautan resmi.",
          href: "/cek-bantuan-program",
          icon: HeartHandshake,
        },
      ],
    },
  },
  {
    type: "group",
    group: {
      id: "perusahaan",
      label: "Perusahaan",
      links: [
        { title: "Tentang Klandesa", desc: "Mengapa kami membangun Klandesa.", href: "/#tentang", icon: Info },
        { title: "Tim Kami", desc: "Orang-orang di balik platform.", href: "/tim", icon: Users },
        { title: "Blog", desc: "Artikel digitalisasi desa dan layanan publik.", href: "/blog", icon: Newspaper },
        { title: "Karir & Kemitraan", desc: "Bergabung membantu desa Indonesia.", href: "/karir", icon: Briefcase },
        { title: "Hubungi kami", desc: "Konsultasi gratis dengan tim Klandesa.", href: "/#kontak", icon: MessageCircle },
      ],
    },
  },
];

/** Semua href internal tanpa hash, untuk tes dan penanda halaman aktif. */
export function listNavPaths(): string[] {
  const out: string[] = [];
  for (const item of NAV_ITEMS) {
    if (item.type === "link") out.push(item.href);
    else {
      for (const l of item.group.links) out.push(l.href);
      if (item.group.feature?.kind === "link") out.push(item.group.feature.href);
    }
  }
  return out.map((h) => h.split("#")[0] || "/");
}

/** Grup/tautan dianggap aktif bila rute saat ini sama atau di bawah salah satu hrefnya (hash diabaikan). */
export function isPathActive(pathname: string, href: string): boolean {
  if (href.includes("#")) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
