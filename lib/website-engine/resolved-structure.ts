import type {
  ResolvedEngineStructure,
  WebsiteCMSPage,
  WebsiteNavItem,
  WebsiteSection,
  WebsiteTemplateStructureV1,
} from "@/lib/website-engine/types";
import { getTemplatePack } from "@/lib/website-engine/template-packs/registry";
import { getAllowedSectionKinds } from "@/lib/website-engine/site-sections";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const MAX_SLUG_LEN = 64;
const MAX_TITLE_LEN = 120;
const MAX_NAV_LABEL = 80;
const MAX_SEO = 320;
const MAX_OG_URL = 500;
const MAX_ID_LEN = 48;
const MAX_BODY = 20_000;

/** Slug aman untuk path segment (huruf kecil, angka, tanda hubung `-` dan garis bawah `_`). */
export function sanitizePageSlug(raw: string): string {
  let s = String(raw || "")
    .trim()
    .toLowerCase()
    .slice(0, MAX_SLUG_LEN)
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/_+/g, "_");
  s = s.replace(/^[-_]+|[-_]+$/g, "");
  return s;
}

/** Aturan: tepat satu halaman dengan slug kosong (beranda); slug lain unik. */
export function getWebsitePagesSlugConflictMessage(
  pages: Array<{ slug: string }>,
): string | null {
  if (!pages.length) return null;
  let emptyCount = 0;
  const nonEmpty: string[] = [];
  for (const p of pages) {
    if (p.slug === "") emptyCount++;
    else nonEmpty.push(p.slug);
  }
  if (emptyCount > 1) {
    return "Hanya satu halaman boleh memiliki slug kosong (beranda).";
  }
  if (emptyCount === 0) {
    return "Harus ada satu halaman beranda (slug kosong).";
  }
  const seen = new Set<string>();
  for (const s of nonEmpty) {
    if (seen.has(s)) {
      return `Slug "${s}" sudah dipakai lebih dari satu halaman.`;
    }
    seen.add(s);
  }
  return null;
}

/** Validasi slug dari payload PATCH v2 sebelum disanitasi (sama dengan aturan CMS). */
export function validateRawV2PagesSlugInput(pages: unknown): string | null {
  if (!Array.isArray(pages) || pages.length === 0) return null;
  let emptyCount = 0;
  const nonEmpty: string[] = [];
  for (const raw of pages) {
    if (!isRecord(raw)) continue;
    const slugRaw =
      raw.slug === "" || raw.slug === undefined
        ? ""
        : sanitizePageSlug(String(raw.slug));
    if (slugRaw === "") emptyCount++;
    else nonEmpty.push(slugRaw);
  }
  if (emptyCount > 1) {
    return "Hanya satu halaman boleh memiliki slug kosong (beranda).";
  }
  if (emptyCount === 0) {
    return "Harus ada satu halaman beranda (slug kosong).";
  }
  const seen = new Set<string>();
  for (const s of nonEmpty) {
    if (seen.has(s)) {
      return `Slug "${s}" sudah dipakai lebih dari satu halaman.`;
    }
    seen.add(s);
  }
  return null;
}

function takeStr(v: unknown, max: number): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (!t || t.length > max) return undefined;
  return t;
}

export function parseNavItems(input: unknown): WebsiteNavItem[] {
  if (!Array.isArray(input)) return [];
  const out: WebsiteNavItem[] = [];
  for (const item of input) {
    if (!isRecord(item)) continue;
    const label = takeStr(item.label, MAX_NAV_LABEL);
    const href = takeStr(item.href, 512);
    if (!label || !href) continue;
    const external = Boolean(item.external);
    out.push({ label, href, external });
  }
  return out;
}

/** Sanitasi href CTA: relatif /... atau https? */
export function sanitizePublicHref(raw: string | undefined): string {
  const s = String(raw || "").trim();
  if (!s) return "#";
  if (s.startsWith("/") && !s.startsWith("//")) return s.slice(0, 512);
  try {
    const u = new URL(s);
    if (u.protocol === "https:" || u.protocol === "http:") return u.toString().slice(0, 512);
  } catch {
    /* ignore */
  }
  return "#";
}

function cleanSectionRaw(raw: unknown): WebsiteSection | null {
  if (!isRecord(raw) || typeof raw.kind !== "string") return null;
  const kind = raw.kind;
  if (kind === "hero") {
    const variant =
      raw.variant === "split" || raw.variant === "center" ? raw.variant : "center";
    return {
      kind: "hero",
      variant,
      title: typeof raw.title === "string" ? raw.title.trim().slice(0, 200) : undefined,
      subtitle: typeof raw.subtitle === "string" ? raw.subtitle.trim().slice(0, 500) : undefined,
    };
  }
  if (kind === "news") {
    let limit = 6;
    if (typeof raw.limit === "number" && Number.isFinite(raw.limit)) {
      limit = Math.min(30, Math.max(1, Math.floor(raw.limit)));
    }
    return {
      kind: "news",
      title: typeof raw.title === "string" ? raw.title.trim().slice(0, 200) : undefined,
      limit,
    };
  }
  if (kind === "contact") {
    return {
      kind: "contact",
      title: typeof raw.title === "string" ? raw.title.trim().slice(0, 200) : undefined,
      show_map: Boolean(raw.show_map),
    };
  }
  if (kind === "rich_text") {
    const body =
      typeof raw.body === "string" ? raw.body.trim().slice(0, MAX_BODY) : "";
    return {
      kind: "rich_text",
      title: typeof raw.title === "string" ? raw.title.trim().slice(0, 200) : undefined,
      body,
    };
  }
  if (kind === "cta") {
    return {
      kind: "cta",
      title: typeof raw.title === "string" ? raw.title.trim().slice(0, 200) : undefined,
      subtitle:
        typeof raw.subtitle === "string" ? raw.subtitle.trim().slice(0, 500) : undefined,
      button_label:
        typeof raw.button_label === "string" ? raw.button_label.trim().slice(0, 80) : undefined,
      button_href: sanitizePublicHref(
        typeof raw.button_href === "string" ? raw.button_href : undefined,
      ),
    };
  }
  void 0;
  return null;
}

export function cleanSectionsArray(
  sections: unknown[],
  templateKey: string,
  allowedKinds: Set<string>,
): WebsiteSection[] {
  const out: WebsiteSection[] = [];
  for (const raw of sections) {
    const s = cleanSectionRaw(raw);
    if (!s) continue;
    if (!allowedKinds.has(s.kind)) continue;
    out.push(clampHeroVariant(s, templateKey));
  }
  return out;
}

function clampHeroVariant(s: WebsiteSection, templateKey: string): WebsiteSection {
  if (s.kind !== "hero") return s;
  const pack = getTemplatePack(templateKey);
  const allowedHero = new Set(pack.heroVariants);
  let variant: "center" | "split" =
    s.variant === "split" || s.variant === "center" ? s.variant : "center";
  if (!allowedHero.has(variant)) {
    variant = (pack.heroVariants[0] ?? "center") as "center" | "split";
  }
  return { ...s, variant };
}

/** Satu section dari payload API (v1 home atau telah di-parse). */
export function cleanWebsiteSectionInput(
  raw: unknown,
  templateKey: string,
  allowedKinds: Set<string>,
): WebsiteSection | null {
  const s = cleanSectionRaw(raw);
  if (!s || !allowedKinds.has(s.kind)) return null;
  return clampHeroVariant(s, templateKey);
}

function parseSeo(raw: unknown): WebsiteCMSPage["seo"] | undefined {
  if (!isRecord(raw)) return undefined;
  const title = takeStr(raw.title, MAX_TITLE_LEN);
  const description = takeStr(raw.description, MAX_SEO);
  const ogImageUrl = takeStr(raw.ogImageUrl, MAX_OG_URL);
  if (!title && !description && !ogImageUrl) return undefined;
  return { title, description, ogImageUrl };
}

export function parseCMSPages(input: unknown, templateKey: string, allowedKinds: Set<string>): WebsiteCMSPage[] {
  if (!Array.isArray(input)) return [];
  const out: WebsiteCMSPage[] = [];
  const seenSlug = new Set<string>();
  for (const raw of input) {
    if (!isRecord(raw)) continue;
    const idRaw = typeof raw.id === "string" ? raw.id.trim().slice(0, MAX_ID_LEN) : "";
    const slugRaw =
      raw.slug === "" || raw.slug === undefined
        ? ""
        : sanitizePageSlug(String(raw.slug));
    if (slugRaw === "") {
      if (seenSlug.has("")) continue;
    } else if (seenSlug.has(slugRaw)) {
      continue;
    }
    seenSlug.add(slugRaw);
    const id =
      idRaw ||
      (slugRaw === "" ? "home" : `p-${slugRaw}`.slice(0, MAX_ID_LEN));
    const title =
      takeStr(raw.title, MAX_TITLE_LEN) ?? (slugRaw === "" ? "Beranda" : slugRaw);
    const layoutPreset =
      typeof raw.layoutPreset === "string"
        ? raw.layoutPreset.trim().slice(0, 40) || undefined
        : undefined;
    const sections = Array.isArray(raw.sections)
      ? cleanSectionsArray(raw.sections as unknown[], templateKey, allowedKinds)
      : [];
    const seo = parseSeo(raw.seo);
    out.push({
      id,
      slug: slugRaw,
      title,
      layoutPreset,
      sections,
      seo,
    });
  }
  return out;
}

export function v1StructureToResolved(v1: WebsiteTemplateStructureV1): ResolvedEngineStructure {
  return {
    version: 2,
    nav: [{ label: "Beranda", href: "/", external: false }],
    pages: [
      {
        id: "home",
        slug: "",
        title: "Beranda",
        sections: v1.pages.home.sections,
      },
    ],
  };
}

export function mergeV2Overlay(
  base: ResolvedEngineStructure,
  overlay: unknown,
  templateKey: string,
  allowedKinds: Set<string>,
): ResolvedEngineStructure {
  if (!isRecord(overlay) || overlay.version !== 2) return base;
  const nav = Array.isArray(overlay.nav) ? parseNavItems(overlay.nav) : undefined;
  let pages = base.pages;
  if (Array.isArray(overlay.pages) && overlay.pages.length > 0) {
    pages = parseCMSPages(overlay.pages, templateKey, allowedKinds);
  }
  const homeSections =
    base.pages.find((p) => p.slug === "")?.sections ??
    base.pages[0]?.sections ??
    [];
  return {
    version: 2,
    nav: nav && nav.length > 0 ? nav : base.nav,
    pages: ensureHomePage(pages, homeSections),
  };
}

/** Pastikan ada tepat satu halaman beranda slug "". */
export function ensureHomePage(
  pages: WebsiteCMSPage[],
  fallbackSections: WebsiteSection[],
): WebsiteCMSPage[] {
  const hasHome = pages.some((p) => p.slug === "");
  if (hasHome) return pages;
  return [
    {
      id: "home",
      slug: "",
      title: "Beranda",
      sections: fallbackSections.length ? fallbackSections : pages[0]?.sections ?? [],
    },
    ...pages,
  ];
}

export function sanitizeV2StructureOverride(
  ov: Record<string, unknown>,
  templateKey: string,
  capabilities: string[],
): { version: 2; nav: WebsiteNavItem[]; pages: WebsiteCMSPage[] } {
  const allowed = new Set(getAllowedSectionKinds(capabilities));
  const nav = parseNavItems(ov.nav);
  const pages = Array.isArray(ov.pages)
    ? parseCMSPages(ov.pages, templateKey, allowed)
    : [];
  const homeFallback =
    pages.find((p) => p.slug === "")?.sections ?? pages[0]?.sections ?? [];
  return {
    version: 2,
    nav,
    pages: ensureHomePage(pages, homeFallback),
  };
}

export function findPageBySlug(
  resolved: ResolvedEngineStructure,
  slug: string,
): WebsiteCMSPage | undefined {
  const norm = slug === "" || slug === "home" ? "" : sanitizePageSlug(slug);
  return resolved.pages.find((p) => p.slug === norm);
}
