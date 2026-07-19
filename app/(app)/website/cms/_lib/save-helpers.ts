import type {
  ResolvedEngineStructure,
  WebsitePageSeo,
  WebsiteSection,
} from "@/lib/website-engine/types";

function cleanStyleForSave(
  style: WebsiteSection["style"] | undefined,
): WebsiteSection["style"] | undefined {
  if (!style) return undefined;
  const container =
    style.container === "container" || style.container === "full"
      ? style.container
      : undefined;
  const paddingY =
    style.paddingY === "none" ||
    style.paddingY === "sm" ||
    style.paddingY === "md" ||
    style.paddingY === "lg"
      ? style.paddingY
      : undefined;
  const background =
    style.background === "none" ||
    style.background === "surface" ||
    style.background === "muted" ||
    style.background === "primaryGradient"
      ? style.background
      : undefined;
  const align =
    style.align === "left" || style.align === "center" ? style.align : undefined;
  const rounded = typeof style.rounded === "boolean" ? style.rounded : undefined;
  const bordered =
    typeof style.bordered === "boolean" ? style.bordered : undefined;
  if (
    container === undefined &&
    paddingY === undefined &&
    background === undefined &&
    align === undefined &&
    rounded === undefined &&
    bordered === undefined
  )
    return undefined;
  return { container, paddingY, background, align, rounded, bordered };
}

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
        image_url: s.image_url?.trim() || undefined,
        style: cleanStyleForSave(s.style),
      };
    }
    if (s.kind === "features") {
      const columns = s.columns === 2 || s.columns === 3 ? s.columns : undefined;
      return {
        kind: "features",
        title: s.title?.trim() || undefined,
        subtitle: s.subtitle?.trim() || undefined,
        columns,
        item1_title: s.item1_title?.trim() || undefined,
        item1_body: s.item1_body?.trim() || undefined,
        item2_title: s.item2_title?.trim() || undefined,
        item2_body: s.item2_body?.trim() || undefined,
        item3_title: s.item3_title?.trim() || undefined,
        item3_body: s.item3_body?.trim() || undefined,
        style: cleanStyleForSave(s.style),
      };
    }
    if (s.kind === "stats") {
      return {
        kind: "stats",
        title: s.title?.trim() || undefined,
        subtitle: s.subtitle?.trim() || undefined,
        stat1_label: s.stat1_label?.trim() || undefined,
        stat1_value: s.stat1_value?.trim() || undefined,
        stat2_label: s.stat2_label?.trim() || undefined,
        stat2_value: s.stat2_value?.trim() || undefined,
        stat3_label: s.stat3_label?.trim() || undefined,
        stat3_value: s.stat3_value?.trim() || undefined,
        style: cleanStyleForSave(s.style),
      };
    }
    if (s.kind === "gallery") {
      return {
        kind: "gallery",
        title: s.title?.trim() || undefined,
        subtitle: s.subtitle?.trim() || undefined,
        image1_url: s.image1_url?.trim() || undefined,
        image2_url: s.image2_url?.trim() || undefined,
        image3_url: s.image3_url?.trim() || undefined,
        image4_url: s.image4_url?.trim() || undefined,
        image5_url: s.image5_url?.trim() || undefined,
        image6_url: s.image6_url?.trim() || undefined,
        style: cleanStyleForSave(s.style),
      };
    }
    if (s.kind === "faq") {
      return {
        kind: "faq",
        title: s.title?.trim() || undefined,
        q1: s.q1?.trim() || undefined,
        a1: s.a1?.trim() || undefined,
        q2: s.q2?.trim() || undefined,
        a2: s.a2?.trim() || undefined,
        q3: s.q3?.trim() || undefined,
        a3: s.a3?.trim() || undefined,
        q4: s.q4?.trim() || undefined,
        a4: s.a4?.trim() || undefined,
        q5: s.q5?.trim() || undefined,
        a5: s.a5?.trim() || undefined,
        style: cleanStyleForSave(s.style),
      };
    }
    if (s.kind === "testimonials") {
      return {
        kind: "testimonials",
        title: s.title?.trim() || undefined,
        quote1: s.quote1?.trim() || undefined,
        name1: s.name1?.trim() || undefined,
        role1: s.role1?.trim() || undefined,
        quote2: s.quote2?.trim() || undefined,
        name2: s.name2?.trim() || undefined,
        role2: s.role2?.trim() || undefined,
        quote3: s.quote3?.trim() || undefined,
        name3: s.name3?.trim() || undefined,
        role3: s.role3?.trim() || undefined,
        style: cleanStyleForSave(s.style),
      };
    }
    if (s.kind === "spacer") {
      const size =
        s.size === "sm" || s.size === "md" || s.size === "lg"
          ? s.size
          : "md";
      return {
        kind: "spacer",
        size,
        show_divider: Boolean(s.show_divider),
        style: cleanStyleForSave(s.style),
      };
    }
    if (s.kind === "news") {
      const limit =
        typeof s.limit === "number" ? clampLimit(s.limit) : undefined;
      return {
        kind: "news",
        title: s.title?.trim() || undefined,
        limit: limit ?? undefined,
        style: cleanStyleForSave(s.style),
      };
    }
    if (s.kind === "regional_news") {
      const limitRaw =
        typeof s.limit === "number"
          ? Math.min(12, Math.max(1, Math.floor(s.limit)))
          : undefined;
      return {
        kind: "regional_news",
        title: s.title?.trim() || undefined,
        limit: limitRaw,
        show_source: s.show_source !== false,
        style: cleanStyleForSave(s.style),
      };
    }
    if (s.kind === "rich_text") {
      return {
        kind: "rich_text",
        title: s.title?.trim() || undefined,
        body: typeof s.body === "string" ? s.body : "",
        style: cleanStyleForSave(s.style),
      };
    }
    if (s.kind === "cta") {
      return {
        kind: "cta",
        title: s.title?.trim() || undefined,
        subtitle: s.subtitle?.trim() || undefined,
        button_label: s.button_label?.trim() || undefined,
        button_href: s.button_href?.trim() || "/",
        style: cleanStyleForSave(s.style),
      };
    }
    return {
      kind: "contact",
      title: s.title?.trim() || undefined,
      show_map: Boolean(s.show_map),
      style: cleanStyleForSave(s.style),
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
