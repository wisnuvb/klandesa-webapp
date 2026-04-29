import type {
  ResolvedEngineStructure,
  WebsitePageSeo,
  WebsiteSection,
} from "@/lib/website-engine/types";

export function clampLimit(v: number): number {
  if (!Number.isFinite(v)) return 6;
  return Math.min(30, Math.max(1, Math.floor(v)));
}

export function cleanSectionsForSave(
  sections: WebsiteSection[],
  heroVariants: Array<"center" | "split">,
): WebsiteSection[] {
  const allowed = new Set(heroVariants);
  const fallbackVariant = (heroVariants[0] ?? "center") as "center" | "split";
  return sections.map((s) => {
    if (s.kind === "hero") {
      let variant: "center" | "split" =
        s.variant === "split" || s.variant === "center" ? s.variant : "center";
      if (!allowed.has(variant)) variant = fallbackVariant;
      return {
        kind: "hero",
        variant,
        title: s.title?.trim() || undefined,
        subtitle: s.subtitle?.trim() || undefined,
      };
    }
    if (s.kind === "news") {
      const limit =
        typeof s.limit === "number" ? clampLimit(s.limit) : undefined;
      return {
        kind: "news",
        title: s.title?.trim() || undefined,
        limit: limit ?? undefined,
      };
    }
    if (s.kind === "rich_text") {
      return {
        kind: "rich_text",
        title: s.title?.trim() || undefined,
        body: typeof s.body === "string" ? s.body : "",
      };
    }
    if (s.kind === "cta") {
      return {
        kind: "cta",
        title: s.title?.trim() || undefined,
        subtitle: s.subtitle?.trim() || undefined,
        button_label: s.button_label?.trim() || undefined,
        button_href: s.button_href?.trim() || "/",
      };
    }
    return {
      kind: "contact",
      title: s.title?.trim() || undefined,
      show_map: Boolean(s.show_map),
    };
  });
}

export function cleanPageSeoForSave(
  seo: WebsitePageSeo | undefined,
): WebsitePageSeo | undefined {
  if (!seo) return undefined;
  const title = seo.title?.trim().slice(0, 120);
  const description = seo.description?.trim().slice(0, 320);
  const ogImageUrl = seo.ogImageUrl?.trim().slice(0, 500);
  if (!title && !description && !ogImageUrl) return undefined;
  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(ogImageUrl ? { ogImageUrl } : {}),
  };
}

export function buildV2Overrides(
  engine: ResolvedEngineStructure,
  heroVariants: Array<"center" | "split">,
) {
  return {
    version: 2 as const,
    nav: engine.nav,
    pages: engine.pages.map((p) => ({
      ...p,
      sections: cleanSectionsForSave(p.sections, heroVariants),
      seo: cleanPageSeoForSave(p.seo),
    })),
  };
}

export function getSectionFieldValue(
  section: WebsiteSection,
  name: string,
): string | number | boolean {
  const r = section as unknown as Record<string, unknown>;
  const v = r[name];
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v;
  if (typeof v === "string") return v;
  if (v === null || v === undefined) return "";
  return String(v);
}
