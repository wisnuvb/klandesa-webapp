import {
  BLOCK_VARIANTS,
  parseBlockVariantAllowlist,
  type BlockVariantAllowlist,
} from "@/lib/website-engine/block-variants";
import { contrastRatio } from "@/lib/website-engine/color";
import { BASE_VILLAGE_WEBSITE_CAPS } from "@/lib/website-engine/feature-capabilities";
import {
  WEBSITE_GOOGLE_FONT_BODY_OPTIONS,
  WEBSITE_GOOGLE_FONT_HEADING_OPTIONS,
} from "@/lib/website-engine/google-fonts";
import { cleanWebsiteSectionInput } from "@/lib/website-engine/resolved-structure";
import { getAllowedSectionKinds, WEBSITE_SECTION_REGISTRY } from "@/lib/website-engine/site-sections";
import type { WebsiteSection, WebsiteThemeTokens } from "@/lib/website-engine/types";

/**
 * Theme Pack Manifest v1: paket tema deklaratif tanpa kode. Memakai markup salah satu pack inti (`basePack`)
 * dan hanya mengatur token tema, varian blok, susunan beranda, dan preset. Semua nilai divalidasi ketat karena
 * manifest berasal dari pihak ketiga.
 */
export const THEME_PACK_MANIFEST_VERSION = 1;

export const CORE_BASE_PACKS = ["modern-village", "classic-heritage", "default"] as const;
export type CoreBasePack = (typeof CORE_BASE_PACKS)[number];

export const THEME_PACK_CATEGORIES = [
  "village",
  "tourism",
  "agriculture",
  "government",
  "smart-village",
  "other",
] as const;

const MAX_JSON_BYTES = 100_000;
const MAX_SECTIONS = 30;
const MAX_PRESETS = 6;
const MAX_FEATURES = 8;

export type ManifestIssue = { path: string; message: string };

export type ThemePackManifestV1 = {
  manifestVersion: 1;
  key: string;
  name: string;
  version: string;
  description: string;
  category: (typeof THEME_PACK_CATEGORIES)[number];
  author: { name: string; url?: string };
  basePack: CoreBasePack;
  theme: WebsiteThemeTokens;
  layout?: { hideSiteHeader?: boolean };
  blockVariants?: BlockVariantAllowlist;
  pages: { home: { sections: WebsiteSection[] } };
  presets: Array<{ key: string; name: string; sections: WebsiteSection[] }>;
  features: string[];
  previews: { image: string; thumbnail: string; demoUrl?: string };
  suggestedPriceIdr?: number;
};

export type ManifestResult =
  | { ok: true; manifest: ThemePackManifestV1 }
  | { ok: false; errors: ManifestIssue[] };

const TOP_KEYS = new Set([
  "manifestVersion", "key", "name", "version", "description", "category", "author", "basePack",
  "theme", "layout", "blockVariants", "pages", "presets", "features", "previews", "suggestedPriceIdr",
]);
const THEME_KEYS = new Set([
  "primary", "accent", "fontBody", "fontHeading", "surface", "surfaceMuted", "border", "mutedForeground", "radiusMd",
]);
const COLOR_KEYS = ["primary", "accent", "surface", "surfaceMuted", "border", "mutedForeground"] as const;

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const KEY_RE = /^[a-z0-9]+(?:-[a-z0-9]+){0,6}$/;
const PRESET_KEY_RE = /^[a-z][a-z0-9_]{1,39}$/;
const SEMVER_RE = /^\d{1,3}\.\d{1,3}\.\d{1,3}$/;
const RADIUS_RE = /^(\d{1,2}(?:\.\d{1,2})?)(rem|px)$/;

const FONT_VALUES = new Set(
  [...WEBSITE_GOOGLE_FONT_BODY_OPTIONS, ...WEBSITE_GOOGLE_FONT_HEADING_OPTIONS]
    .map((o) => o.value)
    .filter(Boolean),
);

function isRec(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function normalizeHex(h: string): string {
  const x = h.toLowerCase();
  return x.length === 4 ? `#${x[1]}${x[1]}${x[2]}${x[2]}${x[3]}${x[3]}` : x;
}

function httpsUrl(v: unknown, max = 500): string | null {
  if (typeof v !== "string" || v.length > max) return null;
  try {
    const u = new URL(v.trim());
    return u.protocol === "https:" && u.hostname.includes(".") ? u.toString() : null;
  } catch {
    return null;
  }
}

export function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  }
  return 0;
}

export function validateThemePackManifest(
  raw: unknown,
  opts: { reservedKeys?: readonly string[] } = {},
): ManifestResult {
  const errors: ManifestIssue[] = [];
  const err = (path: string, message: string) => errors.push({ path, message });

  if (!isRec(raw)) return { ok: false, errors: [{ path: "", message: "Manifest harus berupa objek JSON" }] };
  if (JSON.stringify(raw).length > MAX_JSON_BYTES) {
    return { ok: false, errors: [{ path: "", message: `Ukuran manifest melebihi ${MAX_JSON_BYTES / 1000} KB` }] };
  }

  for (const k of Object.keys(raw)) if (!TOP_KEYS.has(k)) err(k, "Kunci tidak dikenal");

  if (raw.manifestVersion !== THEME_PACK_MANIFEST_VERSION) {
    err("manifestVersion", `Harus bernilai ${THEME_PACK_MANIFEST_VERSION}`);
  }

  const text = (path: string, v: unknown, min: number, max: number): string => {
    if (typeof v !== "string" || v.trim().length < min || v.trim().length > max) {
      err(path, `Teks ${min}–${max} karakter wajib diisi`);
      return "";
    }
    return v.trim();
  };

  const key = text("key", raw.key, 3, 48);
  if (key && !KEY_RE.test(key)) err("key", "Hanya huruf kecil, angka, dan tanda hubung (mis. desa-hijau)");
  if (key && opts.reservedKeys?.includes(key)) err("key", "Kunci ini sudah dipakai pack bawaan");

  const name = text("name", raw.name, 3, 80);
  const description = text("description", raw.description, 10, 500);

  const version = typeof raw.version === "string" ? raw.version.trim() : "";
  if (!SEMVER_RE.test(version)) err("version", "Format versi harus x.y.z (mis. 1.0.0)");

  const category = THEME_PACK_CATEGORIES.find((c) => c === raw.category);
  if (!category) err("category", `Pilih salah satu: ${THEME_PACK_CATEGORIES.join(", ")}`);

  const basePack = CORE_BASE_PACKS.find((p) => p === raw.basePack);
  if (!basePack) err("basePack", `Pilih salah satu: ${CORE_BASE_PACKS.join(", ")}`);

  // author
  let author: ThemePackManifestV1["author"] = { name: "" };
  if (!isRec(raw.author)) err("author", "Wajib diisi (name, url opsional)");
  else {
    for (const k of Object.keys(raw.author)) if (k !== "name" && k !== "url") err(`author.${k}`, "Kunci tidak dikenal");
    const an = text("author.name", raw.author.name, 2, 80);
    let au: string | undefined;
    if (raw.author.url !== undefined) {
      au = httpsUrl(raw.author.url) ?? undefined;
      if (!au) err("author.url", "Harus alamat https yang valid");
    }
    author = { name: an, ...(au ? { url: au } : {}) };
  }

  // theme
  const theme: WebsiteThemeTokens = {};
  if (!isRec(raw.theme)) err("theme", "Wajib diisi");
  else {
    for (const k of Object.keys(raw.theme)) if (!THEME_KEYS.has(k)) err(`theme.${k}`, "Kunci tidak dikenal");
    for (const k of COLOR_KEYS) {
      const v = raw.theme[k];
      if (v === undefined) continue;
      if (typeof v !== "string" || !HEX.test(v)) err(`theme.${k}`, "Warna harus heksadesimal (#rgb atau #rrggbb)");
      else theme[k] = normalizeHex(v);
    }
    for (const k of ["fontBody", "fontHeading"] as const) {
      const v = raw.theme[k];
      if (v === undefined) continue;
      if (typeof v !== "string" || !FONT_VALUES.has(v)) err(`theme.${k}`, "Font harus dari daftar font yang didukung");
      else theme[k] = v;
    }
    if (raw.theme.radiusMd !== undefined) {
      const m = typeof raw.theme.radiusMd === "string" ? RADIUS_RE.exec(raw.theme.radiusMd) : null;
      const n = m ? Number(m[1]) : NaN;
      if (!m || (m[2] === "rem" ? n > 3 : n > 48)) err("theme.radiusMd", "Gunakan rem/px dan maksimal 3rem (48px)");
      else theme.radiusMd = raw.theme.radiusMd as string;
    }
    // Kontras: tombol memakai teks putih di atas warna utama; judul/teks sekunder di atas permukaan.
    const surface = theme.surface ?? "#ffffff";
    const check = (token: "primary" | "accent" | "mutedForeground", against: string, label: string) => {
      const c = theme[token];
      if (!c) return;
      const ratio = contrastRatio(c, against);
      if (ratio < 4.5) err(`theme.${token}`, `Kontras ${label} hanya ${ratio.toFixed(2)}:1, minimal 4.5:1`);
    };
    check("primary", "#ffffff", "terhadap teks putih");
    check("accent", surface, "terhadap permukaan");
    check("mutedForeground", surface, "terhadap permukaan");
  }

  // layout
  let layout: ThemePackManifestV1["layout"];
  if (raw.layout !== undefined) {
    if (!isRec(raw.layout)) err("layout", "Harus berupa objek");
    else {
      for (const k of Object.keys(raw.layout)) if (k !== "hideSiteHeader") err(`layout.${k}`, "Kunci tidak dikenal");
      if (raw.layout.hideSiteHeader !== undefined && typeof raw.layout.hideSiteHeader !== "boolean") {
        err("layout.hideSiteHeader", "Harus true atau false");
      } else if (typeof raw.layout.hideSiteHeader === "boolean") {
        layout = { hideSiteHeader: raw.layout.hideSiteHeader };
      }
    }
  }

  // blockVariants
  let blockVariants: BlockVariantAllowlist | undefined;
  if (raw.blockVariants !== undefined) {
    if (!isRec(raw.blockVariants)) err("blockVariants", "Harus berupa objek");
    else {
      for (const [k, v] of Object.entries(raw.blockVariants)) {
        if (!(k in BLOCK_VARIANTS)) {
          err(`blockVariants.${k}`, "Blok tidak punya varian");
          continue;
        }
        const known = (BLOCK_VARIANTS[k as keyof typeof BLOCK_VARIANTS] as readonly { value: string }[]).map((m) => m.value);
        if (!Array.isArray(v) || v.length === 0 || v.some((x) => typeof x !== "string" || !known.includes(x))) {
          err(`blockVariants.${k}`, `Isi dengan satu atau lebih dari: ${known.join(", ")}`);
        }
      }
      blockVariants = parseBlockVariantAllowlist(raw.blockVariants);
    }
  }

  // sections (semua melewati sanitizer yang sama dengan CMS)
  const allowedKinds = new Set<string>(getAllowedSectionKinds([...BASE_VILLAGE_WEBSITE_CAPS]));
  const knownKinds = new Set(Object.keys(WEBSITE_SECTION_REGISTRY));
  const cleanSections = (path: string, v: unknown): WebsiteSection[] => {
    if (!Array.isArray(v) || v.length === 0 || v.length > MAX_SECTIONS) {
      err(path, `Harus berisi 1–${MAX_SECTIONS} blok`);
      return [];
    }
    const out: WebsiteSection[] = [];
    v.forEach((item, i) => {
      const kind = isRec(item) ? item.kind : undefined;
      if (typeof kind !== "string" || !knownKinds.has(kind)) {
        err(`${path}[${i}].kind`, "Jenis blok tidak dikenal");
        return;
      }
      const cleaned = cleanWebsiteSectionInput(item, basePack ?? "default", allowedKinds);
      if (!cleaned) err(`${path}[${i}]`, "Blok tidak valid");
      else out.push(cleaned);
    });
    return out;
  };

  let homeSections: WebsiteSection[] = [];
  if (!isRec(raw.pages) || !isRec(raw.pages.home)) err("pages.home", "Wajib diisi (pages.home.sections)");
  else {
    for (const k of Object.keys(raw.pages)) if (k !== "home") err(`pages.${k}`, "Hanya halaman beranda yang didukung");
    homeSections = cleanSections("pages.home.sections", raw.pages.home.sections);
  }

  // presets
  const presets: ThemePackManifestV1["presets"] = [];
  if (raw.presets !== undefined) {
    if (!Array.isArray(raw.presets) || raw.presets.length > MAX_PRESETS) err("presets", `Maksimal ${MAX_PRESETS} preset`);
    else {
      const seen = new Set<string>();
      raw.presets.forEach((p, i) => {
        const path = `presets[${i}]`;
        if (!isRec(p)) return err(path, "Harus berupa objek");
        for (const k of Object.keys(p)) if (!["key", "name", "sections"].includes(k)) err(`${path}.${k}`, "Kunci tidak dikenal");
        const pk = typeof p.key === "string" ? p.key : "";
        if (!PRESET_KEY_RE.test(pk)) err(`${path}.key`, "Format: huruf kecil, angka, garis bawah (mis. sorot_wisata)");
        else if (seen.has(pk)) err(`${path}.key`, "Kunci preset ganda");
        seen.add(pk);
        const pn = text(`${path}.name`, p.name, 2, 60);
        const sections = cleanSections(`${path}.sections`, p.sections);
        presets.push({ key: pk, name: pn, sections });
      });
    }
  }

  // features
  const features: string[] = [];
  if (raw.features !== undefined) {
    if (!Array.isArray(raw.features) || raw.features.length > MAX_FEATURES) err("features", `Maksimal ${MAX_FEATURES} butir`);
    else
      raw.features.forEach((f, i) => {
        if (typeof f !== "string" || !f.trim() || f.trim().length > 60) err(`features[${i}]`, "Teks 1–60 karakter");
        else features.push(f.trim());
      });
  }

  // previews
  let previews: ThemePackManifestV1["previews"] = { image: "", thumbnail: "" };
  if (!isRec(raw.previews)) err("previews", "Wajib diisi (image, thumbnail)");
  else {
    for (const k of Object.keys(raw.previews)) if (!["image", "thumbnail", "demoUrl"].includes(k)) err(`previews.${k}`, "Kunci tidak dikenal");
    const image = httpsUrl(raw.previews.image);
    const thumbnail = httpsUrl(raw.previews.thumbnail);
    if (!image) err("previews.image", "Harus alamat https yang valid");
    if (!thumbnail) err("previews.thumbnail", "Harus alamat https yang valid");
    let demoUrl: string | undefined;
    if (raw.previews.demoUrl !== undefined) {
      demoUrl = httpsUrl(raw.previews.demoUrl) ?? undefined;
      if (!demoUrl) err("previews.demoUrl", "Harus alamat https yang valid");
    }
    previews = { image: image ?? "", thumbnail: thumbnail ?? "", ...(demoUrl ? { demoUrl } : {}) };
  }

  let suggestedPriceIdr: number | undefined;
  if (raw.suggestedPriceIdr !== undefined) {
    const n = raw.suggestedPriceIdr;
    if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > 50_000_000) {
      err("suggestedPriceIdr", "Bilangan bulat 0–50.000.000");
    } else suggestedPriceIdr = n;
  }

  if (errors.length || !category || !basePack) return { ok: false, errors };

  return {
    ok: true,
    manifest: {
      manifestVersion: 1,
      key,
      name,
      version,
      description,
      category,
      author,
      basePack,
      theme,
      ...(layout ? { layout } : {}),
      ...(blockVariants ? { blockVariants } : {}),
      pages: { home: { sections: homeSections } },
      presets,
      features,
      previews,
      ...(suggestedPriceIdr !== undefined ? { suggestedPriceIdr } : {}),
    },
  };
}

/**
 * Ubah manifest tervalidasi ke `WebsiteTemplate.structure` yang dipahami mesin saat ini.
 * `templateKey` sengaja diisi `basePack` agar render memakai markup pack inti; identitas paket ada di `slug`/`themePack`.
 */
export function themePackToTemplateStructure(m: ThemePackManifestV1): Record<string, unknown> {
  return {
    version: 1,
    templateKey: m.basePack,
    slug: m.key,
    themePack: { manifestVersion: m.manifestVersion, key: m.key, version: m.version, author: m.author },
    capabilities: [...BASE_VILLAGE_WEBSITE_CAPS],
    features: m.features,
    isPremium: false,
    defaults: { theme: m.theme, ...(m.layout ? { layout: m.layout } : {}) },
    ...(m.blockVariants ? { blockVariants: m.blockVariants } : {}),
    presets: m.presets.map((p) => ({
      key: p.key,
      name: p.name,
      structure: { version: 1, pages: { home: { sections: p.sections } } },
    })),
    pages: { home: { sections: m.pages.home.sections } },
  };
}

/** Kolom `WebsiteTemplate` dari manifest tervalidasi + harga yang ditetapkan platform. */
export function themePackToTemplateRow(m: ThemePackManifestV1, priceIdr: number) {
  return {
    name: m.name,
    description: m.description,
    category: m.category,
    previewImage: m.previews.image,
    thumbnailUrl: m.previews.thumbnail,
    demoUrl: m.previews.demoUrl ?? null,
    structure: themePackToTemplateStructure(m),
    price: priceIdr,
    subscriptionType: "yearly",
  };
}
