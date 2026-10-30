import type { FC, ReactNode } from "react";
import type { BlockVariantAllowlist } from "@/lib/website-engine/block-variants";
import type { RegionalNewsItem } from "@/lib/regional-news/types";
import type { WebsiteNavItem, WebsiteSection, WebsiteThemeTokens } from "@/lib/website-engine/types";

export type SectionRenderContext = {
  section: WebsiteSection;
  village: {
    name: string;
    address: string;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
  };
  news: Array<{ id: number; title: string; date: string }>;
  regionalNews?: RegionalNewsItem[];
  /** Path prefix untuk tautan detail berita, mis. `/site/berita` */
  newsDetailBasePath?: string;
};

export type TenantShellProps = {
  children: ReactNode;
  villageName: string;
  /** Logo desa (opsional); ditampilkan di samping nama desa pada header */
  logoUrl?: string | null;
  hideSiteHeader: boolean;
  /** Untuk scope CSS `tp-{templateKey}` */
  templateKey: string;
  /** Path ter-invoke (dari middleware), untuk nav aktif */
  currentPath: string;
  navItems: WebsiteNavItem[];
};

export type TemplatePack = {
  /** Samakan dengan `templateKey` di DB / seed */
  id: string;
  /** Digabung sebelum defaults JSON template & kustomisasi desa */
  defaultThemeTokens: WebsiteThemeTokens;
  /** Varian hero yang diizinkan untuk pack ini */
  heroVariants: readonly ("center" | "split")[];
  /** Daftar izin varian per blok; kosong = semua varian standar diizinkan */
  blockVariants?: BlockVariantAllowlist;
  Shell: FC<TenantShellProps>;
  renderSection: (ctx: SectionRenderContext) => ReactNode;
};
