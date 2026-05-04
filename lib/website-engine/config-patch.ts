import type { WebsiteCustomization, WebsiteSiteSeo } from "@/lib/website-engine/types";
import { parseCustomization } from "@/lib/website-engine/normalize";
import { mergeLayoutLayers, mergeThemeLayers } from "@/lib/website-engine/theme";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const MAX_FAVICON_PATCH = 500;

function sanitizeFaviconPatch(raw: string): string | undefined {
  const t = raw.trim();
  if (!t || t.length > MAX_FAVICON_PATCH) return undefined;
  return t;
}

export type EngineConfigPatch = {
  preset_key?: string | null;
  overrides?: unknown | null;
  theme?: unknown | null;
  layout?: unknown | null;
  site_seo?: unknown | null;
  /** URL favicon situs (null = hapus) */
  favicon_url?: string | null;
};

/** Parsing aman untuk PATCH /api/website/engine/config (tanpa zod). */
export function parseEngineConfigPatchBody(body: unknown): {
  ok: true;
  patch: EngineConfigPatch;
} | { ok: false; error: string } {
  if (!isRecord(body)) return { ok: false, error: "Body tidak valid" };

  const out: EngineConfigPatch = {};

  if ("preset_key" in body) {
    const v = body.preset_key;
    if (v === null) out.preset_key = null;
    else if (typeof v === "string") out.preset_key = v;
    else return { ok: false, error: "preset_key tidak valid" };
  }

  if ("overrides" in body) {
    const v = body.overrides;
    if (v === null) out.overrides = null;
    else if (typeof v === "object") out.overrides = v;
    else return { ok: false, error: "overrides tidak valid" };
  }

  if ("theme" in body) {
    const v = body.theme;
    if (v === null) out.theme = null;
    else if (typeof v === "object") out.theme = v;
    else return { ok: false, error: "theme tidak valid" };
  }

  if ("layout" in body) {
    const v = body.layout;
    if (v === null) out.layout = null;
    else if (typeof v === "object") out.layout = v;
    else return { ok: false, error: "layout tidak valid" };
  }

  if ("site_seo" in body) {
    const v = body.site_seo;
    if (v === null) out.site_seo = null;
    else if (typeof v === "object") out.site_seo = v;
    else return { ok: false, error: "site_seo tidak valid" };
  }

  if ("favicon_url" in body) {
    const v = body.favicon_url;
    if (v === null) out.favicon_url = null;
    else if (typeof v === "string") out.favicon_url = v;
    else return { ok: false, error: "favicon_url tidak valid" };
  }

  return { ok: true, patch: out };
}

function customizationToJsonObject(c: WebsiteCustomization): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  if (c.presetKey !== undefined) o.presetKey = c.presetKey;
  if (c.overrides !== undefined) o.overrides = c.overrides;
  if (c.theme !== undefined) o.theme = c.theme;
  if (c.layout !== undefined) o.layout = c.layout;
  if (c.siteSeo !== undefined) o.siteSeo = c.siteSeo;
  if (c.faviconUrl !== undefined) o.faviconUrl = c.faviconUrl;
  if (c.savedPresets !== undefined) o.savedPresets = c.savedPresets;
  if (c.savedTemplates !== undefined) o.savedTemplates = c.savedTemplates;
  return o;
}

function mergeSiteSeo(
  current: WebsiteSiteSeo | undefined,
  patch: unknown | null | undefined,
): WebsiteSiteSeo | undefined {
  if (patch === undefined) return current;
  if (patch === null) return undefined;
  const p = parseCustomization({ siteSeo: patch }).siteSeo;
  if (!p) return current;
  return {
    ...current,
    ...p,
  };
}

export function applyEngineConfigPatch(
  current: unknown,
  patch: EngineConfigPatch,
): Record<string, unknown> {
  const parsed = parseCustomization(current);

  const mergedTheme =
    patch.theme === undefined
      ? parsed.theme
      : patch.theme === null
        ? undefined
        : mergeThemeLayers(
            parsed.theme,
            parseCustomization({ theme: patch.theme }).theme,
          );

  const mergedLayout =
    patch.layout === undefined
      ? parsed.layout
      : patch.layout === null
        ? undefined
        : mergeLayoutLayers(
            parsed.layout,
            parseCustomization({ layout: patch.layout }).layout,
          );

  const mergedSiteSeo = mergeSiteSeo(parsed.siteSeo, patch.site_seo);

  let faviconUrl: string | undefined = parsed.faviconUrl;
  if (patch.favicon_url !== undefined) {
    faviconUrl =
      patch.favicon_url === null
        ? undefined
        : sanitizeFaviconPatch(patch.favicon_url);
  }

  const next: WebsiteCustomization = {
    presetKey:
      patch.preset_key === undefined
        ? parsed.presetKey
        : patch.preset_key === null
          ? undefined
          : patch.preset_key || undefined,
    overrides:
      patch.overrides === undefined
        ? parsed.overrides
        : patch.overrides === null
          ? undefined
          : (patch.overrides as unknown),
    theme: mergedTheme && Object.keys(mergedTheme).length ? mergedTheme : undefined,
    layout:
      mergedLayout && Object.keys(mergedLayout).length ? mergedLayout : undefined,
    siteSeo:
      mergedSiteSeo && Object.keys(mergedSiteSeo).length ? mergedSiteSeo : undefined,
    savedPresets: parsed.savedPresets,
    savedTemplates: parsed.savedTemplates,
    ...(faviconUrl ? { faviconUrl } : {}),
  };

  return customizationToJsonObject(next);
}
