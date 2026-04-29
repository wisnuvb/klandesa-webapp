import { mergeTemplateCapabilities } from "@/lib/website-engine/feature-capabilities";
import type {
  TemplateLevelPreset,
  WebsiteLayoutDefaults,
  WebsiteThemeDefaults,
  WebsiteTemplateStructureV1,
} from "@/lib/website-engine/types";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

function parseThemeDefaults(v: unknown): WebsiteThemeDefaults {
  if (!isRecord(v)) return {};
  const primary = typeof v.primary === "string" ? v.primary : undefined;
  const accent = typeof v.accent === "string" ? v.accent : undefined;
  const fontBody = typeof v.fontBody === "string" ? v.fontBody : undefined;
  const fontHeading = typeof v.fontHeading === "string" ? v.fontHeading : undefined;
  const surface = typeof v.surface === "string" ? v.surface : undefined;
  const surfaceMuted =
    typeof v.surfaceMuted === "string" ? v.surfaceMuted : undefined;
  const border = typeof v.border === "string" ? v.border : undefined;
  const mutedForeground =
    typeof v.mutedForeground === "string" ? v.mutedForeground : undefined;
  const radiusMd = typeof v.radiusMd === "string" ? v.radiusMd : undefined;
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

function parseLayoutDefaults(v: unknown): WebsiteLayoutDefaults {
  if (!isRecord(v)) return {};
  const hideSiteHeader =
    typeof v.hideSiteHeader === "boolean" ? v.hideSiteHeader : undefined;
  return { hideSiteHeader };
}

function parseDefaults(v: unknown): {
  theme: WebsiteThemeDefaults;
  layout: WebsiteLayoutDefaults;
} {
  if (!isRecord(v)) return { theme: {}, layout: {} };
  return {
    theme: parseThemeDefaults(v.theme),
    layout: parseLayoutDefaults(v.layout),
  };
}

function parseTemplatePresets(v: unknown): TemplateLevelPreset[] {
  if (!Array.isArray(v)) return [];
  const out: TemplateLevelPreset[] = [];
  for (const item of v) {
    if (!isRecord(item)) continue;
    const key = typeof item.key === "string" ? item.key.trim() : "";
    const name = typeof item.name === "string" ? item.name.trim() : "";
    const structure = item.structure;
    if (!key || !name || !isRecord(structure)) continue;
    out.push({ key, name, structure });
  }
  return out;
}

export type WebsiteTemplateManifest = {
  templateKey: string;
  capabilities: string[];
  themeDefaults: WebsiteThemeDefaults;
  layoutDefaults: WebsiteLayoutDefaults;
  templatePresets: TemplateLevelPreset[];
};

const EMPTY_MANIFEST: WebsiteTemplateManifest = {
  templateKey: "default",
  capabilities: mergeTemplateCapabilities([]),
  themeDefaults: {},
  layoutDefaults: {},
  templatePresets: [],
};

/** Baca meta dari JSON `WebsiteTemplate.structure` (boleh berisi field di luar `version`/`pages`). */
export function parseTemplateStructureManifest(
  raw: unknown,
): WebsiteTemplateManifest {
  if (!isRecord(raw)) return EMPTY_MANIFEST;

  const templateKey =
    typeof raw.templateKey === "string" && raw.templateKey.trim()
      ? raw.templateKey.trim()
      : typeof raw.slug === "string" && raw.slug.trim()
        ? raw.slug.trim()
        : "default";

  const explicitCaps = asStringArray(raw.capabilities).map((s) => s.trim());
  const capabilities =
    explicitCaps.length > 0
      ? [...new Set([...mergeTemplateCapabilities([]), ...explicitCaps])]
      : mergeTemplateCapabilities(asStringArray(raw.features));

  const { theme: themeDefaults, layout: layoutDefaults } = parseDefaults(
    raw.defaults,
  );

  return {
    templateKey,
    capabilities,
    themeDefaults,
    layoutDefaults,
    templatePresets: parseTemplatePresets(raw.presets),
  };
}

/** Normalisasi patch preset dari template ke bentuk yang aman di-merge ke struktur dasar. */
export function normalizePresetStructurePatch(
  structure: unknown,
): WebsiteTemplateStructureV1 | null {
  if (!isRecord(structure)) return null;
  const version = structure.version;
  const pages = structure.pages;
  if (version !== 1 || !isRecord(pages)) return null;
  const home = pages.home;
  if (!isRecord(home) || !Array.isArray(home.sections)) return null;
  return structure as unknown as WebsiteTemplateStructureV1;
}
