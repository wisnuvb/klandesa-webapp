import {
  WEBSITE_GOOGLE_FONT_BODY_OPTIONS,
  WEBSITE_GOOGLE_FONT_HEADING_OPTIONS,
} from "@/lib/website-engine/google-fonts";
import { statItems } from "@/lib/website-engine/section-items";
import type {
  ResolvedEngineStructure,
  WebsiteCMSPage,
  WebsiteSection,
} from "@/lib/website-engine/types";

function fontValue(
  list: Array<{ label: string; value: string }>,
  label: string,
): string {
  return list.find((o) => o.label === label)?.value ?? "";
}

export type SetupFontStyle = {
  key: string;
  label: string;
  description: string;
  fontBody: string;
  fontHeading: string;
};

/** Tiga pilihan huruf siap pakai agar desa tidak perlu memilih font satu per satu. */
export const SETUP_FONT_STYLES: SetupFontStyle[] = [
  {
    key: "modern",
    label: "Modern",
    description: "Bersih dan mudah dibaca di layar HP",
    fontBody: fontValue(WEBSITE_GOOGLE_FONT_BODY_OPTIONS, "Inter"),
    fontHeading: fontValue(WEBSITE_GOOGLE_FONT_HEADING_OPTIONS, "Poppins"),
  },
  {
    key: "klasik",
    label: "Klasik",
    description: "Berkesan resmi dan berwibawa",
    fontBody: fontValue(WEBSITE_GOOGLE_FONT_BODY_OPTIONS, "Open Sans"),
    fontHeading: fontValue(WEBSITE_GOOGLE_FONT_HEADING_OPTIONS, "Playfair Display"),
  },
  {
    key: "ramah",
    label: "Ramah",
    description: "Hangat dan bersahabat",
    fontBody: fontValue(WEBSITE_GOOGLE_FONT_BODY_OPTIONS, "Nunito"),
    fontHeading: fontValue(WEBSITE_GOOGLE_FONT_HEADING_OPTIONS, "Montserrat"),
  },
];

export type SetupStatItem = { label: string; value: string };

export type SetupContent = {
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  showStats: boolean;
  /** Tiga angka ringkas; dipakai bila `showStats` */
  stats: [SetupStatItem, SetupStatItem, SetupStatItem];
};

const EMPTY_STATS: SetupContent["stats"] = [
  { label: "Penduduk", value: "" },
  { label: "Kepala Keluarga", value: "" },
  { label: "Dusun", value: "" },
];

const fmt = (n: number) => n.toLocaleString("id-ID");

/** Angka ringkas dari data kependudukan; nol dibiarkan kosong agar tidak mempublikasikan "0". */
export function suggestStats(counts: {
  total: number;
  households: number;
  hamlets: number;
}): SetupContent["stats"] {
  const v = (n: number) => (n > 0 ? fmt(n) : "");
  return [
    { label: "Penduduk", value: v(counts.total) },
    { label: "Kepala Keluarga", value: v(counts.households) },
    { label: "Dusun", value: v(counts.hamlets) },
  ];
}

function homeIndex(engine: ResolvedEngineStructure): number {
  return engine.pages.findIndex((p) => p.slug === "");
}

/** Isian wizard yang sudah ada di beranda saat ini (agar wizard bisa dibuka ulang tanpa menimpa). */
export function readSetupFromEngine(engine: ResolvedEngineStructure): SetupContent {
  const home = engine.pages[homeIndex(engine)];
  const hero = home?.sections.find((s) => s.kind === "hero");
  const stats = home?.sections.find((s) => s.kind === "stats");
  const existing = stats ? statItems(stats) : [];
  // Wizard menyediakan tiga baris; bila blok punya lebih, sisanya tetap utuh (lihat applySetupToEngine).
  const items: SetupContent["stats"] = existing.length
    ? [0, 1, 2].map((i) => ({
        label: existing[i]?.label ?? "",
        value: existing[i]?.value ?? "",
      })) as SetupContent["stats"]
    : EMPTY_STATS;
  return {
    heroTitle: hero?.kind === "hero" ? (hero.title ?? "") : "",
    heroSubtitle: hero?.kind === "hero" ? (hero.subtitle ?? "") : "",
    heroImageUrl: hero?.kind === "hero" ? (hero.image_url ?? "") : "",
    showStats: Boolean(stats),
    stats: items,
  };
}

const blank = (s: string) => s.trim() || undefined;

/** Terapkan isian wizard ke beranda; bagian lain struktur tidak diubah. */
export function applySetupToEngine(
  engine: ResolvedEngineStructure,
  content: SetupContent,
): ResolvedEngineStructure {
  const idx = homeIndex(engine);
  const base: WebsiteCMSPage =
    idx >= 0
      ? engine.pages[idx]
      : { id: "home", slug: "", title: "Beranda", sections: [] };

  let sections: WebsiteSection[] = [...base.sections];

  const heroAt = sections.findIndex((s) => s.kind === "hero");
  const heroPatch = {
    title: blank(content.heroTitle),
    subtitle: blank(content.heroSubtitle),
    image_url: blank(content.heroImageUrl),
  };
  if (heroAt >= 0) {
    const cur = sections[heroAt];
    sections[heroAt] = { ...(cur as Extract<WebsiteSection, { kind: "hero" }>), ...heroPatch };
  } else {
    sections = [{ kind: "hero", variant: "center", ...heroPatch }, ...sections];
  }

  const statsAt = sections.findIndex((s) => s.kind === "stats");
  if (!content.showStats) {
    sections = sections.filter((s) => s.kind !== "stats");
  } else {
    const edited = content.stats
      .map((st) => ({
        ...(blank(st.label) ? { label: blank(st.label) } : {}),
        ...(blank(st.value) ? { value: blank(st.value) } : {}),
      }))
      .filter((st) => st.label || st.value);
    // Item ke-4 dst. yang sudah ada di blok (ditambah lewat CMS) tidak ikut terhapus oleh wizard.
    const extra = statsAt >= 0 ? statItems(sections[statsAt]).slice(3) : [];
    const stats: WebsiteSection = {
      ...(statsAt >= 0 ? (sections[statsAt] as Extract<WebsiteSection, { kind: "stats" }>) : {}),
      kind: "stats",
      title: statsAt >= 0 ? (sections[statsAt] as { title?: string }).title : "Sekilas Desa",
      items: [...edited, ...extra],
    };
    if (statsAt >= 0) sections[statsAt] = stats;
    else {
      const afterHero = sections.findIndex((s) => s.kind === "hero") + 1;
      sections.splice(afterHero, 0, stats);
    }
  }

  const page: WebsiteCMSPage = { ...base, sections };
  const pages = [...engine.pages];
  if (idx >= 0) pages[idx] = page;
  else pages.unshift(page);
  return { ...engine, pages };
}
