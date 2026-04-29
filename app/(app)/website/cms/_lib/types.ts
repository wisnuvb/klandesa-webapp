import type {
  ResolvedEngineStructure,
  WebsiteSiteSeo,
} from "@/lib/website-engine/types";
import type { SectionCmsField, SectionKind } from "@/lib/website-engine/site-sections";

export type SectionSchemaEntry = {
  kind: SectionKind;
  label: string;
  cmsFields: SectionCmsField[];
};

export type EngineConfigResponse = {
  template: { id: number; name: string };
  template_key: string;
  template_pack?: { id: string; hero_variants: string[] };
  capabilities: string[];
  theme_defaults: Record<string, string | undefined>;
  layout_defaults: { hideSiteHeader?: boolean };
  customization: {
    presetKey?: string;
    overrides?: unknown;
    theme?: Record<string, string | undefined>;
    layout?: { hideSiteHeader?: boolean };
    siteSeo?: WebsiteSiteSeo;
    faviconUrl?: string;
  };
  effective_structure: ResolvedEngineStructure;
  effective_theme: Record<string, string | undefined>;
  effective_layout: { hideSiteHeader?: boolean };
  effective_site_seo?: WebsiteSiteSeo;
  presets: Array<{ key: string; name: string }>;
  allowed_section_kinds: SectionKind[];
  section_schema?: SectionSchemaEntry[];
};

/** Field yang masuk perbandingan dirty (harus sama struktur dengan load awal). */
export type CmsWorkspaceSnapshotInput = {
  presetKey: string;
  engine: ResolvedEngineStructure | null;
  pageIndex: number;
  themePrimary: string;
  themeAccent: string;
  themeFont: string;
  themeFontHeading: string;
  themeSurface: string;
  themeSurfaceMuted: string;
  themeBorder: string;
  themeMutedFg: string;
  themeRadiusMd: string;
  hideSiteHeader: boolean;
  faviconUrl: string;
};

export type WebsiteCmsLoadResult = CmsWorkspaceSnapshotInput & {
  templateName: string;
  templateKey: string;
  capabilities: string[];
  presets: Array<{ key: string; name: string }>;
  allowedKinds: SectionKind[];
  sectionSchema: SectionSchemaEntry[];
  heroVariants: Array<"center" | "split">;
  initialSnapshot: string;
};
