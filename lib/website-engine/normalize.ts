import type {
  WebsiteCustomization,
  WebsiteLayoutCustomization,
  WebsiteLayoutDefaults,
  WebsiteSiteSeo,
  WebsiteTemplateStructureV1,
  WebsiteThemeTokens,
  ResolvedEngineStructure,
} from "@/lib/website-engine/types";
import { findBuiltinPreset } from "@/lib/website-engine/presets";
import {
  normalizePresetStructurePatch,
  parseTemplateStructureManifest,
} from "@/lib/website-engine/manifest";
import { mergeThemeLayers, mergeLayoutLayers } from "@/lib/website-engine/theme";
import { getTemplatePack } from "@/lib/website-engine/template-packs/registry";
import { getAllowedSectionKinds } from "@/lib/website-engine/site-sections";
import {
  mergeV2Overlay,
  v1StructureToResolved,
} from "@/lib/website-engine/resolved-structure";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const MAX_THEME_STRING_LEN = 160;

function sanitizeTheme(input: unknown): WebsiteThemeTokens | undefined {
  if (!isRecord(input)) return undefined;
  const take = (v: unknown) =>
    typeof v === "string" && v.trim().length > 0 && v.length <= MAX_THEME_STRING_LEN
      ? v.trim()
      : undefined;
  const primary = take(input.primary);
  const accent = take(input.accent);
  const fontBody = take(input.fontBody);
  const fontHeading = take(input.fontHeading);
  const surface = take(input.surface);
  const surfaceMuted = take(input.surfaceMuted);
  const border = take(input.border);
  const mutedForeground = take(input.mutedForeground);
  const radiusMd = take(input.radiusMd);
  if (
    primary === undefined &&
    accent === undefined &&
    fontBody === undefined &&
    fontHeading === undefined &&
    surface === undefined &&
    surfaceMuted === undefined &&
    border === undefined &&
    mutedForeground === undefined &&
    radiusMd === undefined
  )
    return undefined;
  return {
    primary,
    accent,
    fontBody,
    fontHeading,
    surface,
    surfaceMuted,
    border,
    mutedForeground,
    radiusMd,
  };
}

function sanitizeLayout(input: unknown): WebsiteLayoutCustomization | undefined {
  if (!isRecord(input)) return undefined;
  if (typeof input.hideSiteHeader === "boolean")
    return { hideSiteHeader: input.hideSiteHeader };
  return undefined;
}

const MAX_SEO_TITLE = 120;
const MAX_SEO_DESC = 320;
const MAX_OG_URL = 500;
const MAX_FAVICON_URL = 500;

function takeUrlish(v: unknown, max: number): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (!t || t.length > max) return undefined;
  return t;
}


function sanitizeSiteSeo(input: unknown): WebsiteSiteSeo | undefined {
  if (!isRecord(input)) return undefined;
  const take = (v: unknown, max: number) =>
    typeof v === "string" && v.trim().length > 0 && v.length <= max
      ? v.trim()
      : undefined;
  const defaultTitle = take(input.defaultTitle, MAX_SEO_TITLE);
  const defaultDescription = take(input.defaultDescription, MAX_SEO_DESC);
  const ogImageUrl = take(input.ogImageUrl, MAX_OG_URL);
  if (!defaultTitle && !defaultDescription && !ogImageUrl) return undefined;
  return { defaultTitle, defaultDescription, ogImageUrl };
}

function stripV2OverridesForV1Merge(overrides: unknown): unknown {
  if (!isRecord(overrides)) return overrides;
  if (overrides.version === 2) return undefined;
  return overrides;
}

export function parseCustomization(input: unknown): WebsiteCustomization {
  if (!isRecord(input)) return {};
  const presetKey = typeof input.presetKey === "string" ? input.presetKey : undefined;
  const overrides = "overrides" in input ? input.overrides : undefined;
  const theme =
    "theme" in input ? sanitizeTheme((input as Record<string, unknown>).theme) : undefined;
  const layout =
    "layout" in input ? sanitizeLayout((input as Record<string, unknown>).layout) : undefined;
  const siteSeo =
    "siteSeo" in input
      ? sanitizeSiteSeo((input as Record<string, unknown>).siteSeo)
      : undefined;
  const savedPresets = Array.isArray(input.savedPresets)
    ? (input.savedPresets as unknown[])
        .filter(isRecord)
        .map((p) => ({
          key: typeof p.key === "string" ? p.key : "",
          name: typeof p.name === "string" ? p.name : "",
          overrides: "overrides" in p ? p.overrides : undefined,
          createdAt: typeof p.createdAt === "string" ? p.createdAt : "",
        }))
        .filter((p) => p.key && p.name && p.createdAt)
    : undefined;
  const faviconUrl = takeUrlish(
    (input as Record<string, unknown>).faviconUrl,
    MAX_FAVICON_URL,
  );
  return {
    presetKey,
    overrides,
    theme,
    layout,
    siteSeo,
    savedPresets,
    ...(faviconUrl ? { faviconUrl } : {}),
  };
}

export function normalizeTemplateStructure(input: unknown): WebsiteTemplateStructureV1 {
  if (isRecord(input) && input.version === 1 && isRecord(input.pages)) {
    const pages = input.pages as Record<string, unknown>;
    const home = pages.home;
    if (isRecord(home) && Array.isArray(home.sections)) {
      return input as unknown as WebsiteTemplateStructureV1;
    }
  }

  return {
    version: 1,
    pages: {
      home: {
        sections: [{ kind: "hero" }, { kind: "news", limit: 6 }, { kind: "contact" }],
      },
    },
  };
}

function deepMerge(base: unknown, override: unknown): unknown {
  if (!isRecord(base) || !isRecord(override)) return override ?? base;
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(override)) {
    if (k in out) {
      out[k] = deepMerge(out[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function findTemplatePresetStructure(
  templateStructure: unknown,
  presetKey: string,
): WebsiteTemplateStructureV1 | null {
  const manifest = parseTemplateStructureManifest(templateStructure);
  const found = manifest.templatePresets.find((p) => p.key === presetKey);
  if (!found) return null;
  return normalizePresetStructurePatch(found.structure);
}

/** Preset dari template DB lebih dulu, lalu builtin. */
export function resolvePresetMergeLayer(
  templateStructure: unknown,
  presetKey: string | undefined,
): WebsiteTemplateStructureV1 | null {
  const key = String(presetKey || "").trim();
  if (!key) return null;
  const fromTemplate = findTemplatePresetStructure(templateStructure, key);
  if (fromTemplate) return fromTemplate;
  const builtin = findBuiltinPreset(key)?.structure ?? null;
  return builtin;
}

export function resolveEffectiveStructure(params: {
  templateStructure: unknown;
  customization: unknown;
}): ResolvedEngineStructure {
  const manifest = parseTemplateStructureManifest(params.templateStructure);
  const cz = parseCustomization(params.customization);
  const allowedKinds = new Set(getAllowedSectionKinds(manifest.capabilities));
  const templateKey = manifest.templateKey;

  const v1Base = normalizeTemplateStructure(params.templateStructure);
  const fromPreset = resolvePresetMergeLayer(params.templateStructure, cz.presetKey);
  const afterPreset: WebsiteTemplateStructureV1 = fromPreset
    ? normalizeTemplateStructure(deepMerge(v1Base, fromPreset))
    : v1Base;
  const v1OnlyOverrides = stripV2OverridesForV1Merge(cz.overrides);
  const mergedV1: WebsiteTemplateStructureV1 = v1OnlyOverrides
    ? normalizeTemplateStructure(deepMerge(afterPreset, v1OnlyOverrides))
    : afterPreset;

  let resolved = v1StructureToResolved(mergedV1);
  if (isRecord(cz.overrides) && cz.overrides.version === 2) {
    resolved = mergeV2Overlay(resolved, cz.overrides, templateKey, allowedKinds);
  }
  return resolved;
}

/** Kompatibilitas: struktur v1 efektif untuk kode yang masih mengharapkan `pages.home`. */
export function resolvedToV1Home(resolved: ResolvedEngineStructure): WebsiteTemplateStructureV1 {
  const home = resolved.pages.find((p) => p.slug === "") ?? resolved.pages[0];
  return {
    version: 1,
    pages: {
      home: { sections: home?.sections ?? [] },
    },
  };
}

/**
 * SEO situs efektif. Jika `templateStructure` diberikan, metadata beranda menggabungkan
 * `siteSeo` tersimpan dengan `seo` pada halaman slug `""` (beranda).
 */
export function resolveEffectiveSiteSeo(
  customization: unknown,
  templateStructure?: unknown,
) {
  const base = parseCustomization(customization).siteSeo;
  if (templateStructure === undefined) {
    return base;
  }
  const resolved = resolveEffectiveStructure({ templateStructure, customization });
  const home = resolved.pages.find((p) => p.slug === "") ?? resolved.pages[0];
  const h = home?.seo;
  const merged: WebsiteSiteSeo = {
    defaultTitle: h?.title?.trim() || base?.defaultTitle,
    defaultDescription: h?.description?.trim() || base?.defaultDescription,
    ogImageUrl: h?.ogImageUrl?.trim() || base?.ogImageUrl,
  };
  if (!merged.defaultTitle && !merged.defaultDescription && !merged.ogImageUrl)
    return undefined;
  return merged;
}

/** URL favicon global (bukan per halaman). */
export function resolveTenantFaviconUrl(customization: unknown): string | undefined {
  return parseCustomization(customization).faviconUrl;
}

export function resolveEffectiveTheme(params: {
  templateStructure: unknown;
  customization: unknown;
}): WebsiteThemeTokens {
  const manifest = parseTemplateStructureManifest(params.templateStructure);
  const cz = parseCustomization(params.customization);
  const pack = getTemplatePack(manifest.templateKey);
  return mergeThemeLayers(
    pack.defaultThemeTokens,
    manifest.themeDefaults,
    cz.theme,
  );
}

export function resolveEffectiveLayout(params: {
  templateStructure: unknown;
  customization: unknown;
}): WebsiteLayoutCustomization {
  const manifest = parseTemplateStructureManifest(params.templateStructure);
  const cz = parseCustomization(params.customization);
  const defaults: WebsiteLayoutDefaults = manifest.layoutDefaults;
  return mergeLayoutLayers(defaults, cz.layout);
}
