export type WebsiteSection =
  | {
      kind: "hero";
      /** Tampilan hero; default `center` */
      variant?: "center" | "split";
      title?: string;
      subtitle?: string;
    }
  | {
      kind: "news";
      title?: string;
      limit?: number;
    }
  | {
      kind: "contact";
      title?: string;
      show_map?: boolean;
    }
  | {
      kind: "rich_text";
      title?: string;
      /** Teks biasa; paragraf dipisah baris baru */
      body: string;
    }
  | {
      kind: "cta";
      title?: string;
      subtitle?: string;
      button_label?: string;
      button_href?: string;
    };

export type WebsitePage = {
  sections: WebsiteSection[];
};

export type WebsiteTemplateStructureV1 = {
  version: 1;
  pages: {
    home: WebsitePage;
  };
};

export type WebsiteNavItem = {
  label: string;
  href: string;
  /** true = buka tab baru (tautan eksternal) */
  external?: boolean;
};

export type WebsitePageSeo = {
  title?: string;
  description?: string;
  /** Gambar Open Graph khusus halaman ini */
  ogImageUrl?: string;
};

export type WebsiteCMSPage = {
  id: string;
  /** "" = beranda (`/site` atau `/`) */
  slug: string;
  title: string;
  layoutPreset?: string;
  sections: WebsiteSection[];
  seo?: WebsitePageSeo;
};

/** Struktur efektif situs (normalisasi internal; v1 template diproyeksikan ke bentuk ini). */
export type ResolvedEngineStructure = {
  version: 2;
  nav: WebsiteNavItem[];
  pages: WebsiteCMSPage[];
};

export type WebsiteSiteSeo = {
  defaultTitle?: string;
  defaultDescription?: string;
  ogImageUrl?: string;
};

/** Token tema desa; value freeform string (hex, hsl, name, font stack, radius). */
export type WebsiteThemeTokens = {
  primary?: string;
  accent?: string;
  fontBody?: string;
  /** Judul / heading (mis. serif untuk template klasik) */
  fontHeading?: string;
  surface?: string;
  surfaceMuted?: string;
  border?: string;
  mutedForeground?: string;
  /** Mis. `0.75rem`, `1rem` */
  radiusMd?: string;
};

export type WebsiteThemeDefaults = WebsiteThemeTokens;

export type WebsiteLayoutDefaults = {
  hideSiteHeader?: boolean;
};

export type WebsiteLayoutCustomization = {
  hideSiteHeader?: boolean;
};

export type TemplateLevelPreset = {
  key: string;
  name: string;
  /** Patch struktur v1 (akan di-deepMerge ke struktur dasar template). */
  structure: unknown;
};

export type WebsiteCustomization = {
  presetKey?: string;
  overrides?: unknown;
  theme?: WebsiteThemeTokens;
  layout?: WebsiteLayoutCustomization;
  /** Override meta situs (title template, deskripsi, gambar OG) */
  siteSeo?: WebsiteSiteSeo;
  /** Favicon satu untuk seluruh situs (URL gambar, mis. .ico atau .png) */
  faviconUrl?: string;
  savedPresets?: Array<{
    key: string;
    name: string;
    overrides: unknown;
    createdAt: string;
  }>;
};
