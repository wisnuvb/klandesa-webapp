import type { WebsiteSection } from "@/lib/website-engine/types";
import {
  BLOCK_VARIANTS,
  clampSectionVariant,
  defaultBlockVariant,
  mergeVariantAllowlists,
  type BlockVariantAllowlist,
} from "@/lib/website-engine/block-variants";
import { ITEM_LIMITS } from "@/lib/website-engine/section-items";
import { getTemplatePack } from "@/lib/website-engine/template-packs/registry";

export type SectionKind = WebsiteSection["kind"];

export type SectionCmsField =
  | { name: string; label: string; type: "text" }
  | { name: string; label: string; type: "textarea" }
  | { name: string; label: string; type: "number"; min?: number; max?: number }
  | { name: string; label: string; type: "checkbox" }
  | { name: string; label: string; type: "image" }
  | {
      name: string;
      label: string;
      type: "variant";
      options: Array<{ value: string; label: string }>;
    }
  | {
      name: string;
      label: string;
      type: "list";
      /** Nama satu item, mis. "kartu" -> "Tambah kartu" */
      itemLabel: string;
      max: number;
      fields: Array<{
        name: string;
        label: string;
        type: "text" | "textarea" | "image";
      }>;
    }
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

function variantField(
  kind: keyof typeof BLOCK_VARIANTS,
): Extract<SectionCmsField, { type: "variant" }> {
  return {
    name: "variant",
    label: "Tampilan",
    type: "variant",
    options: BLOCK_VARIANTS[kind].map((v) => ({ value: v.value, label: v.label })),
  };
}

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
      { name: "image_url", label: "Gambar latar (opsional)", type: "image" },
    ],
    createDefault: () => ({
      kind: "hero",
      variant: "center",
      title: "",
      subtitle: "",
      image_url: "",
    }),
  },
  features: {
    kind: "features",
    label: "Fitur / Keunggulan",
    requiredCapabilities: ["section_features"],
    cmsFields: [
      variantField("features"),
      { name: "title", label: "Judul blok", type: "text" },
      { name: "subtitle", label: "Subjudul", type: "text" },
      {
        name: "columns",
        label: "Jumlah kolom (desktop)",
        type: "select",
        options: [
          { value: "2", label: "2 kolom" },
          { value: "3", label: "3 kolom" },
        ],
      },
      {
        name: "items",
        label: "Kartu",
        type: "list",
        itemLabel: "kartu",
        max: ITEM_LIMITS.features,
        fields: [
          { name: "title", label: "Judul", type: "text" },
          { name: "body", label: "Deskripsi", type: "textarea" },
        ],
      },
    ],
    createDefault: () => ({
      kind: "features",
      variant: defaultBlockVariant("features"),
      title: "Kenapa memilih desa kami",
      subtitle: "Ringkasan keunggulan utama yang bisa Anda tonjolkan.",
      columns: 3,
      items: [
        { title: "Pelayanan Cepat", body: "Proses administrasi lebih ringkas dengan alur yang jelas." },
        { title: "Transparan", body: "Informasi desa dan kegiatan dipublikasikan secara rutin." },
        { title: "Inklusif", body: "Layanan dan informasi mudah diakses untuk semua warga." },
      ],
    }),
  },
  stats: {
    kind: "stats",
    label: "Statistik Singkat",
    requiredCapabilities: ["section_stats"],
    cmsFields: [
      variantField("stats"),
      { name: "title", label: "Judul blok", type: "text" },
      { name: "subtitle", label: "Subjudul", type: "text" },
      {
        name: "items",
        label: "Angka",
        type: "list",
        itemLabel: "angka",
        max: ITEM_LIMITS.stats,
        fields: [
          { name: "label", label: "Label", type: "text" },
          { name: "value", label: "Nilai", type: "text" },
        ],
      },
    ],
    createDefault: () => ({
      kind: "stats",
      variant: defaultBlockVariant("stats"),
      title: "Sekilas Desa",
      subtitle: "Angka ringkas untuk memperkuat kepercayaan pengunjung.",
      items: [
        { label: "Penduduk", value: "—" },
        { label: "Dusun", value: "—" },
        { label: "RT/RW", value: "—" },
      ],
    }),
  },
  gallery: {
    kind: "gallery",
    label: "Galeri Foto",
    requiredCapabilities: ["section_gallery"],
    cmsFields: [
      variantField("gallery"),
      { name: "title", label: "Judul blok", type: "text" },
      { name: "subtitle", label: "Subjudul", type: "text" },
      {
        name: "items",
        label: "Foto",
        type: "list",
        itemLabel: "foto",
        max: ITEM_LIMITS.gallery,
        fields: [
          { name: "url", label: "Gambar", type: "image" },
          { name: "caption", label: "Keterangan foto (dibaca pembaca layar)", type: "text" },
        ],
      },
    ],
    createDefault: () => ({
      kind: "gallery",
      variant: defaultBlockVariant("gallery"),
      title: "Galeri Desa",
      subtitle: "Dokumentasi kegiatan dan potensi desa.",
      items: [],
    }),
  },
  faq: {
    kind: "faq",
    label: "FAQ",
    requiredCapabilities: ["section_faq"],
    cmsFields: [
      variantField("faq"),
      { name: "title", label: "Judul blok", type: "text" },
      {
        name: "items",
        label: "Pertanyaan",
        type: "list",
        itemLabel: "pertanyaan",
        max: ITEM_LIMITS.faq,
        fields: [
          { name: "q", label: "Pertanyaan", type: "text" },
          { name: "a", label: "Jawaban", type: "textarea" },
        ],
      },
    ],
    createDefault: () => ({
      kind: "faq",
      variant: defaultBlockVariant("faq"),
      title: "Pertanyaan yang sering diajukan",
      items: [
        { q: "Bagaimana jam pelayanan kantor desa?", a: "Silakan sesuaikan jam pelayanan sesuai kebijakan desa." },
        { q: "Bagaimana cara mengurus surat?", a: "Silakan sesuaikan langkah pengurusan surat pada bagian ini." },
      ],
    }),
  },
  testimonials: {
    kind: "testimonials",
    label: "Testimoni",
    requiredCapabilities: ["section_testimonials"],
    cmsFields: [
      variantField("testimonials"),
      { name: "title", label: "Judul blok", type: "text" },
      {
        name: "items",
        label: "Testimoni",
        type: "list",
        itemLabel: "testimoni",
        max: ITEM_LIMITS.testimonials,
        fields: [
          { name: "quote", label: "Isi testimoni", type: "textarea" },
          { name: "name", label: "Nama", type: "text" },
          { name: "role", label: "Peran (opsional)", type: "text" },
        ],
      },
    ],
    createDefault: () => ({
      kind: "testimonials",
      variant: defaultBlockVariant("testimonials"),
      title: "Apa kata warga",
      items: [{ quote: "Pelayanan lebih rapi dan informatif.", name: "Warga" }],
    }),
  },
  spacer: {
    kind: "spacer",
    label: "Spasi / Pemisah",
    requiredCapabilities: ["section_spacer"],
    cmsFields: [
      {
        name: "size",
        label: "Ukuran spasi",
        type: "select",
        options: [
          { value: "sm", label: "Kecil" },
          { value: "md", label: "Sedang" },
          { value: "lg", label: "Besar" },
        ],
      },
      { name: "show_divider", label: "Tampilkan garis", type: "checkbox" },
    ],
    createDefault: () => ({
      kind: "spacer",
      size: "md",
      show_divider: false,
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
  regional_news: {
    kind: "regional_news",
    label: "Berita Regional (Media)",
    requiredCapabilities: ["section_regional_news"],
    cmsFields: [
      { name: "title", label: "Judul blok", type: "text" },
      { name: "limit", label: "Jumlah item", type: "number", min: 1, max: 12 },
      { name: "show_source", label: "Tampilkan nama media", type: "checkbox" },
    ],
    createDefault: () => ({
      kind: "regional_news",
      title: "Berita di Sekitar Kami",
      limit: 6,
      show_source: true,
    }),
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
  return (Object.keys(WEBSITE_SECTION_REGISTRY) as SectionKind[]).filter(
    (k) => {
      const def = WEBSITE_SECTION_REGISTRY[k];
      return def.requiredCapabilities.every((c) => capSet.has(c));
    },
  );
}

export function getSectionDefinition(
  kind: SectionKind,
): WebsiteSectionDefinition {
  return WEBSITE_SECTION_REGISTRY[kind];
}

export function sectionSchemaForTemplate(
  templateKey: string,
  allowedKinds: SectionKind[],
  /** Pembatas varian tambahan dari manifest template (digabung dengan milik pack) */
  extraVariantAllow?: BlockVariantAllowlist,
) {
  const pack = getTemplatePack(templateKey);
  const allowedVariants = new Set(pack.heroVariants);
  return allowedKinds.map((kind) => {
    const def = WEBSITE_SECTION_REGISTRY[kind];
    const blockAllow = (
      mergeVariantAllowlists(pack.blockVariants, extraVariantAllow) as
        | Record<string, readonly string[] | undefined>
        | undefined
    )?.[kind];
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
        : def.cmsFields.map((f) =>
            f.type === "variant" && blockAllow
              ? { ...f, options: f.options.filter((o) => blockAllow.includes(o.value)) }
              : f,
          );
    return {
      kind: def.kind,
      label: def.label,
      cmsFields,
    };
  });
}

function resolveVariablePath(
  path: string,
  ctx: {
    village: {
      name: string;
      address: string;
      phone?: string | null;
      email?: string | null;
      website?: string | null;
    };
    news: Array<{ id: number; title: string; date: string }>;
  },
): string | null {
  const p = path.trim();
  if (!p) return null;
  if (p === "today") return new Date().toLocaleDateString("id-ID");
  if (p === "news.count") return String(ctx.news.length);
  if (p.startsWith("village.")) {
    const key = p.slice("village.".length);
    const v = (ctx.village as Record<string, unknown>)[key];
    if (typeof v === "string") return v;
    if (v === null || v === undefined) return "";
    return String(v);
  }
  return null;
}

function interpolateTemplateString(
  input: string,
  ctx: {
    village: {
      name: string;
      address: string;
      phone?: string | null;
      email?: string | null;
      website?: string | null;
    };
    news: Array<{ id: number; title: string; date: string }>;
  },
): string {
  if (!input.includes("{{")) return input;
  return input.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, raw) => {
    const resolved = resolveVariablePath(String(raw || ""), ctx);
    return resolved === null ? `{{${String(raw || "").trim()}}}` : resolved;
  });
}

function interpolateSection(
  section: WebsiteSection,
  ctx: {
    village: {
      name: string;
      address: string;
      phone?: string | null;
      email?: string | null;
      website?: string | null;
    };
    news: Array<{ id: number; title: string; date: string }>;
  },
): WebsiteSection {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(
    section as unknown as Record<string, unknown>,
  )) {
    if (typeof v === "string") out[k] = interpolateTemplateString(v, ctx);
    else if (k === "items" && Array.isArray(v)) {
      // Teks di dalam daftar (kartu, FAQ, dll.) juga boleh memakai {{variabel}}.
      out[k] = v.map((it) =>
        it && typeof it === "object" && !Array.isArray(it)
          ? Object.fromEntries(
              Object.entries(it as Record<string, unknown>).map(([ik, iv]) => [
                ik,
                typeof iv === "string" ? interpolateTemplateString(iv, ctx) : iv,
              ]),
            )
          : it,
      );
    } else out[k] = v;
  }
  return out as WebsiteSection;
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
  regionalNews?: import("@/lib/regional-news/types").RegionalNewsItem[];
  newsDetailBasePath?: string;
}) {
  const pack = getTemplatePack(params.templateKey);
  // Section template DB (v1) tidak lewat sanitizer, jadi daftar izin varian pack ditegakkan juga saat render.
  const section = clampSectionVariant(
    interpolateSection(params.section, {
      village: params.village,
      news: params.news,
    }),
    pack.blockVariants,
  );
  return pack.renderSection({
    section,
    village: params.village,
    news: params.news,
    regionalNews: params.regionalNews ?? [],
    newsDetailBasePath: params.newsDetailBasePath,
  });
}

export {
  ContactBlock,
  CTABlock,
  FaqBlock,
  FeaturesBlock,
  GalleryBlock,
  HeroCenterBlock,
  HeroSplitBlock,
  NewsBlock,
  RegionalNewsBlock,
  RichTextBlock,
  SpacerBlock,
  StatsBlock,
  TestimonialsBlock,
} from "@/lib/website-engine/section-primitives";
