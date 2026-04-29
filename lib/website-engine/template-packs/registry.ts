import type { TemplatePack } from "@/lib/website-engine/template-packs/types";
import type { WebsiteThemeTokens } from "@/lib/website-engine/types";
import { classicHeritagePack } from "@/lib/website-engine/template-packs/classic-heritage-pack";
import { defaultTemplatePack } from "@/lib/website-engine/template-packs/default-pack";
import { modernVillagePack } from "@/lib/website-engine/template-packs/modern-village-pack";

function aliasPack(
  base: TemplatePack,
  id: string,
  tokens?: Partial<WebsiteThemeTokens>,
): TemplatePack {
  return {
    ...base,
    id,
    defaultThemeTokens: { ...base.defaultThemeTokens, ...tokens },
  };
}

const PACKS_BY_KEY: Record<string, TemplatePack> = {
  [modernVillagePack.id]: modernVillagePack,
  [classicHeritagePack.id]: classicHeritagePack,
  "professional-gov": aliasPack(modernVillagePack, "professional-gov", {
    primary: "#1e3a8a",
    surfaceMuted: "#eff6ff",
  }),
  "tourism-village": aliasPack(modernVillagePack, "tourism-village", {
    primary: "#c026d3",
    accent: "#86198f",
    surfaceMuted: "#fdf4ff",
  }),
  "green-agriculture": aliasPack(modernVillagePack, "green-agriculture", {
    primary: "#15803d",
    surfaceMuted: "#f0fdf4",
  }),
  "smart-village": aliasPack(modernVillagePack, "smart-village", {
    primary: "#0369a1",
    accent: "#0c4a6e",
    surfaceMuted: "#f0f9ff",
  }),
};

/** Peta templateKey (dari `WebsiteTemplate.structure`) ke pack UI. */
export function getTemplatePack(templateKey: string | undefined | null): TemplatePack {
  const k = String(templateKey || "").trim().toLowerCase();
  if (k && PACKS_BY_KEY[k]) return PACKS_BY_KEY[k];
  return defaultTemplatePack;
}
