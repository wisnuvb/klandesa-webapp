export type WebsiteSectionStyle = {
  container?: "container" | "full";
  paddingY?: "none" | "sm" | "md" | "lg";
  background?: "none" | "surface" | "muted" | "primaryGradient";
  align?: "left" | "center";
  rounded?: boolean;
  bordered?: boolean;
};

type WithStyle<T> = T & { style?: WebsiteSectionStyle };

export type WebsiteSection =
  | WithStyle<{
      kind: "hero";
      /** Tampilan hero; default `center` */
      variant?: "center" | "split";
      title?: string;
      subtitle?: string;
      image_url?: string;
    }>
  | WithStyle<{
      kind: "features";
      title?: string;
      subtitle?: string;
      columns?: 2 | 3;
      item1_title?: string;
      item1_body?: string;
      item2_title?: string;
      item2_body?: string;
      item3_title?: string;
      item3_body?: string;
    }>
  | WithStyle<{
      kind: "stats";
      title?: string;
      subtitle?: string;
      stat1_label?: string;
      stat1_value?: string;
      stat2_label?: string;
      stat2_value?: string;
      stat3_label?: string;
      stat3_value?: string;
    }>
  | WithStyle<{
      kind: "gallery";
      title?: string;
      subtitle?: string;
      image1_url?: string;
      image2_url?: string;
      image3_url?: string;
      image4_url?: string;
      image5_url?: string;
      image6_url?: string;
    }>
  | WithStyle<{
      kind: "faq";
      title?: string;
      q1?: string;
      a1?: string;
      q2?: string;
      a2?: string;
      q3?: string;
      a3?: string;
      q4?: string;
      a4?: string;
      q5?: string;
      a5?: string;
    }>
  | WithStyle<{
      kind: "testimonials";
      title?: string;
      quote1?: string;
      name1?: string;
      role1?: string;
      quote2?: string;
      name2?: string;
      role2?: string;
      quote3?: string;
      name3?: string;
      role3?: string;
    }>
  | WithStyle<{
      kind: "spacer";
      size?: "sm" | "md" | "lg";
      show_divider?: boolean;
    }>
  | WithStyle<{
      kind: "news";
      title?: string;
      limit?: number;
    }>
  | WithStyle<{
      kind: "contact";
      title?: string;
      show_map?: boolean;
    }>
  | WithStyle<{
      kind: "rich_text";
      title?: string;
      /** Teks biasa; paragraf dipisah baris baru */
      body: string;
    }>
  | WithStyle<{
      kind: "cta";
      title?: string;
      subtitle?: string;
      button_label?: string;
      button_href?: string;
    }>;

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

export type WebsiteCustomizationSnapshot = {
  presetKey?: string;
  overrides?: unknown;
  theme?: WebsiteThemeTokens;
  layout?: WebsiteLayoutCustomization;
  siteSeo?: WebsiteSiteSeo;
  faviconUrl?: string;
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
  savedTemplates?: Array<{
    id: string;
    name: string;
    description?: string;
    snapshot: WebsiteCustomizationSnapshot;
    createdAt: string;
    updatedAt: string;
  }>;
};
