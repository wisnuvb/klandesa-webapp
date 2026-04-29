import type { WebsiteSection } from "@/lib/website-engine/types";
import { getTemplatePack } from "@/lib/website-engine/template-packs/registry";

export type SectionKind = WebsiteSection["kind"];

export type SectionCmsField =
  | { name: string; label: string; type: "text" }
  | { name: string; label: string; type: "textarea" }
  | { name: string; label: string; type: "number"; min?: number; max?: number }
  | { name: string; label: string; type: "checkbox" }
  | {
      name: string;
      label: string;
      type: "select";
      options: Array<{ value: string; label: string }>;
    };

export type WebsiteSectionDefinition = {
  kind: SectionKind;
  label: string;
  /** Kosong = selalu diizinkan */
  requiredCapabilities: string[];
  cmsFields: SectionCmsField[];
  createDefault: () => WebsiteSection;
};

export const WEBSITE_SECTION_REGISTRY: Record<
  SectionKind,
  WebsiteSectionDefinition
> = {
  hero: {
    kind: "hero",
    label: "Hero",
    requiredCapabilities: [],
    cmsFields: [
      {
        name: "variant",
        label: "Varian tampilan",
        type: "select",
        options: [
          { value: "center", label: "Tengah" },
          { value: "split", label: "Dua kolom" },
        ],
      },
      { name: "title", label: "Judul (opsional)", type: "text" },
      { name: "subtitle", label: "Subtitle", type: "text" },
    ],
    createDefault: () => ({
      kind: "hero",
      variant: "center",
      title: "",
      subtitle: "",
    }),
  },
  news: {
    kind: "news",
    label: "Berita",
    requiredCapabilities: ["section_news"],
    cmsFields: [
      { name: "title", label: "Judul blok", type: "text" },
      { name: "limit", label: "Jumlah item", type: "number", min: 1, max: 30 },
    ],
    createDefault: () => ({ kind: "news", title: "", limit: 6 }),
  },
  contact: {
    kind: "contact",
    label: "Kontak",
    requiredCapabilities: ["section_contact"],
    cmsFields: [
      { name: "title", label: "Judul blok", type: "text" },
      { name: "show_map", label: "Tampilkan tautan peta", type: "checkbox" },
    ],
    createDefault: () => ({ kind: "contact", title: "", show_map: false }),
  },
  rich_text: {
    kind: "rich_text",
    label: "Teks / paragraf",
    requiredCapabilities: ["section_rich_text"],
    cmsFields: [
      { name: "title", label: "Judul blok (opsional)", type: "text" },
      { name: "body", label: "Isi", type: "textarea" },
    ],
    createDefault: () => ({ kind: "rich_text", title: "", body: "" }),
  },
  cta: {
    kind: "cta",
    label: "Ajakan bertindak (CTA)",
    requiredCapabilities: ["section_cta"],
    cmsFields: [
      { name: "title", label: "Judul", type: "text" },
      { name: "subtitle", label: "Subtitle", type: "text" },
      { name: "button_label", label: "Teks tombol", type: "text" },
      { name: "button_href", label: "Tautan tombol", type: "text" },
    ],
    createDefault: () => ({
      kind: "cta",
      title: "",
      subtitle: "",
      button_label: "Hubungi kami",
      button_href: "/",
    }),
  },
};

export function getAllowedSectionKinds(capabilities: string[]): SectionKind[] {
  const capSet = new Set(capabilities);
  return (Object.keys(WEBSITE_SECTION_REGISTRY) as SectionKind[]).filter((k) => {
    const def = WEBSITE_SECTION_REGISTRY[k];
    return def.requiredCapabilities.every((c) => capSet.has(c));
  });
}

export function getSectionDefinition(
  kind: SectionKind,
): WebsiteSectionDefinition {
  return WEBSITE_SECTION_REGISTRY[kind];
}

export function sectionSchemaForTemplate(
  templateKey: string,
  allowedKinds: SectionKind[],
) {
  const pack = getTemplatePack(templateKey);
  const allowedVariants = new Set(pack.heroVariants);
  return allowedKinds.map((kind) => {
    const def = WEBSITE_SECTION_REGISTRY[kind];
    const cmsFields =
      kind === "hero"
        ? def.cmsFields
            .map((f) => {
              if (f.type === "select" && f.name === "variant") {
                return {
                  ...f,
                  options: f.options.filter((o) =>
                    allowedVariants.has(o.value as "center" | "split"),
                  ),
                };
              }
              return f;
            })
            .filter((f) => {
              if (f.type === "select" && f.name === "variant") {
                return f.options.length > 0;
              }
              return true;
            })
        : def.cmsFields;
    return {
      kind: def.kind,
      label: def.label,
      cmsFields,
    };
  });
}

export function renderWebsiteSection(params: {
  templateKey: string;
  section: WebsiteSection;
  village: {
    name: string;
    address: string;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
  };
  news: Array<{ id: number; title: string; date: string }>;
  newsDetailBasePath?: string;
}) {
  const pack = getTemplatePack(params.templateKey);
  return pack.renderSection({
    section: params.section,
    village: params.village,
    news: params.news,
    newsDetailBasePath: params.newsDetailBasePath,
  });
}

export { HeroCenterBlock, HeroSplitBlock, NewsBlock, ContactBlock } from "@/lib/website-engine/section-primitives";
