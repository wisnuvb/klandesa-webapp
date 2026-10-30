import type {
  FaqItem,
  FeatureItem,
  GalleryItem,
  StatItem,
  TestimonialItem,
  WebsiteSection,
} from "@/lib/website-engine/types";

/** Batas jumlah item per blok; menjaga ukuran JSON dan tampilan tetap wajar. */
export const ITEM_LIMITS = {
  features: 12,
  stats: 6,
  gallery: 24,
  faq: 20,
  testimonials: 12,
} as const;

/** Nilai field daftar di editor CMS (array objek berisi string). */
export type SectionListValue = Array<Record<string, string>>;

const MAX_URL = 800;

type Rec = Record<string, unknown>;

function isRec(v: unknown): v is Rec {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown, max: number): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim().slice(0, max);
  return t || undefined;
}

function compact<T extends Rec>(o: T): T {
  const out: Rec = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k] = v;
  return out as T;
}

function rows(raw: unknown, limit: number): Rec[] {
  return Array.isArray(raw) ? raw.filter(isRec).slice(0, limit) : [];
}

export function cleanFeatureItems(raw: unknown): FeatureItem[] {
  return rows(raw, ITEM_LIMITS.features)
    .map((r) => compact({ title: str(r.title, 120), body: str(r.body, 600) }))
    .filter((it) => it.title || it.body);
}

export function cleanStatItems(raw: unknown): StatItem[] {
  return rows(raw, ITEM_LIMITS.stats)
    .map((r) => compact({ label: str(r.label, 80), value: str(r.value, 80) }))
    .filter((it) => it.label || it.value);
}

export function cleanGalleryItems(raw: unknown): GalleryItem[] {
  const out: GalleryItem[] = [];
  for (const r of rows(raw, ITEM_LIMITS.gallery)) {
    const url = str(r.url, MAX_URL);
    if (!url) continue;
    out.push(compact({ url, caption: str(r.caption, 160) }));
  }
  return out;
}

export function cleanFaqItems(raw: unknown): FaqItem[] {
  return rows(raw, ITEM_LIMITS.faq)
    .map((r) => compact({ q: str(r.q, 200), a: str(r.a, 1000) }))
    .filter((it) => it.q || it.a);
}

export function cleanTestimonialItems(raw: unknown): TestimonialItem[] {
  return rows(raw, ITEM_LIMITS.testimonials)
    .map((r) =>
      compact({ quote: str(r.quote, 800), name: str(r.name, 80), role: str(r.role, 80) }),
    )
    .filter((it) => it.quote || it.name);
}

/** Slot tetap lama -> array, agar data yang sudah tersimpan tetap terbaca. */
function slots(count: number, make: (n: number) => Rec): Rec[] {
  return Array.from({ length: count }, (_, i) => make(i + 1));
}

const LEGACY_KEYS: Record<string, string[]> = {
  features: [1, 2, 3].flatMap((n) => [`item${n}_title`, `item${n}_body`]),
  stats: [1, 2, 3].flatMap((n) => [`stat${n}_label`, `stat${n}_value`]),
  gallery: [1, 2, 3, 4, 5, 6].map((n) => `image${n}_url`),
  faq: [1, 2, 3, 4, 5].flatMap((n) => [`q${n}`, `a${n}`]),
  testimonials: [1, 2, 3].flatMap((n) => [`quote${n}`, `name${n}`, `role${n}`]),
};

function legacyRows(kind: string, raw: Rec): Rec[] {
  switch (kind) {
    case "features":
      return slots(3, (n) => ({ title: raw[`item${n}_title`], body: raw[`item${n}_body`] }));
    case "stats":
      return slots(3, (n) => ({ label: raw[`stat${n}_label`], value: raw[`stat${n}_value`] }));
    case "gallery":
      return slots(6, (n) => ({ url: raw[`image${n}_url`] }));
    case "faq":
      return slots(5, (n) => ({ q: raw[`q${n}`], a: raw[`a${n}`] }));
    case "testimonials":
      return slots(3, (n) => ({
        quote: raw[`quote${n}`],
        name: raw[`name${n}`],
        role: raw[`role${n}`],
      }));
    default:
      return [];
  }
}

function cleanFor(kind: string, raw: unknown): unknown[] {
  switch (kind) {
    case "features":
      return cleanFeatureItems(raw);
    case "stats":
      return cleanStatItems(raw);
    case "gallery":
      return cleanGalleryItems(raw);
    case "faq":
      return cleanFaqItems(raw);
    case "testimonials":
      return cleanTestimonialItems(raw);
    default:
      return [];
  }
}

export function hasItemList(kind: string): boolean {
  return kind in LEGACY_KEYS;
}

/**
 * Item bersih sebuah blok. `items` (bentuk baru) menang bila ada, walau kosong; kalau tidak,
 * dibaca dari slot lama. Berlaku juga untuk objek mentah yang belum disanitasi.
 */
function itemsOf(kind: string, raw: Rec): unknown[] {
  return cleanFor(kind, Array.isArray(raw.items) ? raw.items : legacyRows(kind, raw));
}

export const featureItems = (s: Rec | WebsiteSection): FeatureItem[] =>
  itemsOf("features", s as Rec) as FeatureItem[];
export const statItems = (s: Rec | WebsiteSection): StatItem[] =>
  itemsOf("stats", s as Rec) as StatItem[];
export const galleryItems = (s: Rec | WebsiteSection): GalleryItem[] =>
  itemsOf("gallery", s as Rec) as GalleryItem[];
export const faqItems = (s: Rec | WebsiteSection): FaqItem[] =>
  itemsOf("faq", s as Rec) as FaqItem[];
export const testimonialItems = (s: Rec | WebsiteSection): TestimonialItem[] =>
  itemsOf("testimonials", s as Rec) as TestimonialItem[];

/** Ubah blok ke bentuk kanonik: `items` terisi, slot lama dibuang. Idempoten. */
export function upgradeSectionItems(section: WebsiteSection): WebsiteSection {
  const kind = section.kind as string;
  if (!hasItemList(kind)) return section;
  const raw = section as unknown as Rec;
  const next: Rec = { ...raw };
  for (const k of LEGACY_KEYS[kind]) delete next[k];
  next.items = itemsOf(kind, raw);
  return next as unknown as WebsiteSection;
}
