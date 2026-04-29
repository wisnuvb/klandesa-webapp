import type { ResolvedEngineStructure } from "@/lib/website-engine/types";
import type { WebsiteSiteSeo } from "@/lib/website-engine/types";
import {
  getAllowedSectionKinds,
  type SectionKind,
} from "@/lib/website-engine/site-sections";
import type {
  EngineConfigResponse,
  SectionSchemaEntry,
  WebsiteCmsLoadResult,
} from "./types";
import { emptyEngine } from "./constants";
import { serializeCmsWorkspaceState } from "./snapshot";

export function mergeLegacySiteSeoIntoHome(
  eff: ResolvedEngineStructure,
  legacySeo: WebsiteSiteSeo | undefined,
): ResolvedEngineStructure {
  if (!legacySeo || !eff.pages.length) return eff;
  const hi = eff.pages.findIndex((p) => p.slug === "");
  if (hi < 0) return eff;
  const p = eff.pages[hi];
  const hasPageSeo = Boolean(
    p.seo?.title?.trim() ||
      p.seo?.description?.trim() ||
      p.seo?.ogImageUrl?.trim(),
  );
  if (hasPageSeo) return eff;
  const t = legacySeo.defaultTitle?.trim();
  const d = legacySeo.defaultDescription?.trim();
  const o = legacySeo.ogImageUrl?.trim();
  if (!t && !d && !o) return eff;
  const pages = [...eff.pages];
  pages[hi] = {
    ...p,
    seo: {
      ...(t ? { title: t } : {}),
      ...(d ? { description: d } : {}),
      ...(o ? { ogImageUrl: o } : {}),
    },
  };
  return { ...eff, pages };
}

export function normalizeHeroVariants(
  raw: string[] | undefined,
): Array<"center" | "split"> {
  const hv = raw;
  const heroV: Array<"center" | "split"> =
    Array.isArray(hv) && hv.length
      ? (hv.filter((x) => x === "center" || x === "split") as Array<
          "center" | "split"
        >)
      : ["center"];
  return heroV.length ? heroV : ["center"];
}

/** Memetakan response GET /api/website/engine/config → state awal halaman (murni, tanpa side effect). */
export function mapEngineConfigResponseToLoadResult(
  json: EngineConfigResponse,
): WebsiteCmsLoadResult {
  const templateName = json.template?.name ?? "-";
  const templateKey = json.template_key ?? "";
  const capabilities = Array.isArray(json.capabilities) ? json.capabilities : [];
  const presets = Array.isArray(json.presets) ? json.presets : [];
  const presetKey = json.customization?.presetKey ?? "";

  const effRaw = json.effective_structure;
  let eff: ResolvedEngineStructure =
    effRaw?.version === 2 && Array.isArray(effRaw.pages) ? effRaw : emptyEngine();

  const legacySeo =
    json.customization &&
    typeof json.customization === "object" &&
    "siteSeo" in json.customization
      ? (json.customization as { siteSeo?: WebsiteSiteSeo }).siteSeo
      : undefined;
  eff = mergeLegacySiteSeoIntoHome(eff, legacySeo);

  const allowedKinds: SectionKind[] =
    Array.isArray(json.allowed_section_kinds) && json.allowed_section_kinds.length
      ? json.allowed_section_kinds
      : getAllowedSectionKinds(capabilities);

  const sectionSchema: SectionSchemaEntry[] = Array.isArray(json.section_schema)
    ? (json.section_schema as SectionSchemaEntry[])
    : [];

  const heroVariants = normalizeHeroVariants(json.template_pack?.hero_variants);

  const th = json.effective_theme ?? {};
  const themePrimary = typeof th.primary === "string" ? th.primary : "";
  const themeAccent = typeof th.accent === "string" ? th.accent : "";
  const themeFont = typeof th.fontBody === "string" ? th.fontBody : "";
  const themeFontHeading =
    typeof th.fontHeading === "string" ? th.fontHeading : "";
  const themeSurface = typeof th.surface === "string" ? th.surface : "";
  const themeSurfaceMuted =
    typeof th.surfaceMuted === "string" ? th.surfaceMuted : "";
  const themeBorder = typeof th.border === "string" ? th.border : "";
  const themeMutedFg =
    typeof th.mutedForeground === "string" ? th.mutedForeground : "";
  const themeRadiusMd = typeof th.radiusMd === "string" ? th.radiusMd : "";
  const hideSiteHeader = Boolean(json.effective_layout?.hideSiteHeader);
  const faviconUrl =
    typeof json.customization?.faviconUrl === "string"
      ? json.customization.faviconUrl
      : "";

  const workspace: WebsiteCmsLoadResult = {
    templateName,
    templateKey,
    capabilities,
    presets,
    presetKey,
    engine: eff,
    pageIndex: 0,
    allowedKinds,
    sectionSchema,
    heroVariants,
    themePrimary,
    themeAccent,
    themeFont,
    themeFontHeading,
    themeSurface,
    themeSurfaceMuted,
    themeBorder,
    themeMutedFg,
    themeRadiusMd,
    hideSiteHeader,
    faviconUrl,
    initialSnapshot: "",
  };

  workspace.initialSnapshot = serializeCmsWorkspaceState({
    presetKey,
    engine: eff,
    pageIndex: 0,
    themePrimary,
    themeAccent,
    themeFont,
    themeFontHeading,
    themeSurface,
    themeSurfaceMuted,
    themeBorder,
    themeMutedFg,
    themeRadiusMd,
    hideSiteHeader,
    faviconUrl,
  });

  return workspace;
}
