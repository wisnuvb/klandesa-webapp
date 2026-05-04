import type { WebsiteSection } from "@/lib/website-engine/types";
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
      { name: "item1_title", label: "Item 1 - Judul", type: "text" },
      { name: "item1_body", label: "Item 1 - Deskripsi", type: "textarea" },
      { name: "item2_title", label: "Item 2 - Judul", type: "text" },
      { name: "item2_body", label: "Item 2 - Deskripsi", type: "textarea" },
      { name: "item3_title", label: "Item 3 - Judul", type: "text" },
      { name: "item3_body", label: "Item 3 - Deskripsi", type: "textarea" },
    ],
    createDefault: () => ({
      kind: "features",
      title: "Kenapa memilih desa kami",
      subtitle: "Ringkasan keunggulan utama yang bisa Anda tonjolkan.",
      columns: 3,
      item1_title: "Pelayanan Cepat",
      item1_body: "Proses administrasi lebih ringkas dengan alur yang jelas.",
      item2_title: "Transparan",
      item2_body: "Informasi desa dan kegiatan dipublikasikan secara rutin.",
      item3_title: "Inklusif",
      item3_body: "Layanan dan informasi mudah diakses untuk semua warga.",
    }),
  },
  stats: {
    kind: "stats",
    label: "Statistik Singkat",
    requiredCapabilities: ["section_stats"],
    cmsFields: [
      { name: "title", label: "Judul blok", type: "text" },
      { name: "subtitle", label: "Subjudul", type: "text" },
      { name: "stat1_label", label: "Stat 1 - Label", type: "text" },
      { name: "stat1_value", label: "Stat 1 - Nilai", type: "text" },
      { name: "stat2_label", label: "Stat 2 - Label", type: "text" },
      { name: "stat2_value", label: "Stat 2 - Nilai", type: "text" },
      { name: "stat3_label", label: "Stat 3 - Label", type: "text" },
      { name: "stat3_value", label: "Stat 3 - Nilai", type: "text" },
    ],
    createDefault: () => ({
      kind: "stats",
      title: "Sekilas Desa",
      subtitle: "Angka ringkas untuk memperkuat kepercayaan pengunjung.",
      stat1_label: "Penduduk",
      stat1_value: "—",
      stat2_label: "Dusun",
      stat2_value: "—",
      stat3_label: "RT/RW",
      stat3_value: "—",
    }),
  },
  gallery: {
    kind: "gallery",
    label: "Galeri Foto",
    requiredCapabilities: ["section_gallery"],
    cmsFields: [
      { name: "title", label: "Judul blok", type: "text" },
      { name: "subtitle", label: "Subjudul", type: "text" },
      { name: "image1_url", label: "Gambar 1", type: "image" },
      { name: "image2_url", label: "Gambar 2", type: "image" },
      { name: "image3_url", label: "Gambar 3", type: "image" },
      { name: "image4_url", label: "Gambar 4", type: "image" },
      { name: "image5_url", label: "Gambar 5", type: "image" },
      { name: "image6_url", label: "Gambar 6", type: "image" },
    ],
    createDefault: () => ({
      kind: "gallery",
      title: "Galeri Desa",
      subtitle: "Dokumentasi kegiatan dan potensi desa.",
      image1_url: "",
      image2_url: "",
      image3_url: "",
      image4_url: "",
      image5_url: "",
      image6_url: "",
    }),
  },
  faq: {
    kind: "faq",
    label: "FAQ",
    requiredCapabilities: ["section_faq"],
    cmsFields: [
      { name: "title", label: "Judul blok", type: "text" },
      { name: "q1", label: "Pertanyaan 1", type: "text" },
      { name: "a1", label: "Jawaban 1", type: "textarea" },
      { name: "q2", label: "Pertanyaan 2", type: "text" },
      { name: "a2", label: "Jawaban 2", type: "textarea" },
      { name: "q3", label: "Pertanyaan 3", type: "text" },
      { name: "a3", label: "Jawaban 3", type: "textarea" },
      { name: "q4", label: "Pertanyaan 4", type: "text" },
      { name: "a4", label: "Jawaban 4", type: "textarea" },
      { name: "q5", label: "Pertanyaan 5", type: "text" },
      { name: "a5", label: "Jawaban 5", type: "textarea" },
    ],
    createDefault: () => ({
      kind: "faq",
      title: "Pertanyaan yang sering diajukan",
      q1: "Bagaimana jam pelayanan kantor desa?",
      a1: "Silakan sesuaikan jam pelayanan sesuai kebijakan desa.",
      q2: "Bagaimana cara mengurus surat?",
      a2: "Silakan sesuaikan langkah pengurusan surat pada bagian ini.",
      q3: "",
      a3: "",
      q4: "",
      a4: "",
      q5: "",
      a5: "",
    }),
  },
  testimonials: {
    kind: "testimonials",
    label: "Testimoni",
    requiredCapabilities: ["section_testimonials"],
    cmsFields: [
      { name: "title", label: "Judul blok", type: "text" },
      { name: "quote1", label: "Testimoni 1", type: "textarea" },
      { name: "name1", label: "Nama 1", type: "text" },
      { name: "role1", label: "Peran 1 (opsional)", type: "text" },
      { name: "quote2", label: "Testimoni 2", type: "textarea" },
      { name: "name2", label: "Nama 2", type: "text" },
      { name: "role2", label: "Peran 2 (opsional)", type: "text" },
      { name: "quote3", label: "Testimoni 3", type: "textarea" },
      { name: "name3", label: "Nama 3", type: "text" },
      { name: "role3", label: "Peran 3 (opsional)", type: "text" },
    ],
    createDefault: () => ({
      kind: "testimonials",
      title: "Apa kata warga",
      quote1: "Pelayanan lebih rapi dan informatif.",
      name1: "Warga",
      role1: "",
      quote2: "",
      name2: "",
      role2: "",
      quote3: "",
      name3: "",
      role3: "",
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
    else out[k] = v;
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
  newsDetailBasePath?: string;
}) {
  const pack = getTemplatePack(params.templateKey);
  const section = interpolateSection(params.section, {
    village: params.village,
    news: params.news,
  });
  return pack.renderSection({
    section,
    village: params.village,
    news: params.news,
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
  RichTextBlock,
  SpacerBlock,
  StatsBlock,
  TestimonialsBlock,
} from "@/lib/website-engine/section-primitives";
