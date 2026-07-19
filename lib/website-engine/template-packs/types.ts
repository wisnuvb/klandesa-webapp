import type { FC, ReactNode } from "react";
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
  Shell: FC<TenantShellProps>;
  renderSection: (ctx: SectionRenderContext) => ReactNode;
};
