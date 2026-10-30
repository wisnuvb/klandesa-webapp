import type {
  FaqVariant,
  FeaturesVariant,
  GalleryVariant,
  StatsVariant,
  TestimonialsVariant,
} from "@/lib/website-engine/types";

/** Persegi sketsa pratinjau pada kanvas 60x40: [x, y, lebar, tinggi, tebal?]. `true` = elemen gelap (judul/angka). */
export type WireRect = [number, number, number, number, boolean?];

export type BlockVariantMeta<V extends string> = {
  value: V;
  label: string;
  description: string;
  wire: WireRect[];
};

const card = (x: number, y: number, w: number, h: number): WireRect[] => [
  [x, y, w, h],
  [x + 2, y + 2, w - 6, 2, true],
  [x + 2, y + 6, w - 4, 1],
];

export const BLOCK_VARIANTS = {
  features: [
    { value: "cards", label: "Kartu", description: "Kotak berbingkai berdampingan", wire: [...card(2, 8, 17, 24), ...card(21, 8, 17, 24), ...card(40, 8, 17, 24)] },
    { value: "list", label: "Daftar bernomor", description: "Satu kolom dengan nomor", wire: [[6, 6, 6, 6, true], [16, 7, 30, 2, true], [16, 11, 36, 1], [6, 17, 6, 6, true], [16, 18, 30, 2, true], [16, 22, 36, 1], [6, 28, 6, 6, true], [16, 29, 30, 2, true], [16, 33, 36, 1]] },
    { value: "minimal", label: "Minimalis", description: "Tanpa kotak, garis di atas", wire: [[3, 10, 16, 1, true], [3, 14, 14, 2, true], [3, 19, 16, 1], [22, 10, 16, 1, true], [22, 14, 14, 2, true], [22, 19, 16, 1], [41, 10, 16, 1, true], [41, 14, 14, 2, true], [41, 19, 16, 1]] },
  ],
  stats: [
    { value: "cards", label: "Kartu", description: "Angka dalam kotak", wire: [[2, 10, 17, 20], [21, 10, 17, 20], [40, 10, 18, 20], [5, 15, 10, 5, true], [24, 15, 10, 5, true], [43, 15, 10, 5, true]] },
    { value: "band", label: "Pita warna", description: "Latar warna utama, angka putih", wire: [[0, 8, 60, 24, true], [6, 15, 10, 5], [25, 15, 10, 5], [44, 15, 10, 5], [6, 23, 12, 1], [25, 23, 12, 1], [44, 23, 12, 1]] },
    { value: "inline", label: "Sebaris", description: "Angka besar dipisah garis", wire: [[4, 14, 12, 6, true], [4, 24, 14, 1], [22, 10, 0.6, 20], [26, 14, 12, 6, true], [26, 24, 14, 1], [42, 10, 0.6, 20], [46, 14, 10, 6, true], [46, 24, 12, 1]] },
  ],
  gallery: [
    { value: "grid", label: "Kotak", description: "Foto sama besar", wire: [[2, 4, 17, 14], [21, 4, 17, 14], [40, 4, 18, 14], [2, 22, 17, 14], [21, 22, 17, 14], [40, 22, 18, 14]] },
    { value: "mosaic", label: "Mosaik", description: "Satu foto besar, sisanya kecil", wire: [[2, 4, 28, 32, true], [32, 4, 13, 15], [47, 4, 11, 15], [32, 21, 13, 15], [47, 21, 11, 15]] },
    { value: "strip", label: "Geser samping", description: "Satu baris yang bisa digeser", wire: [[2, 10, 22, 20], [26, 10, 22, 20], [50, 10, 10, 20], [2, 34, 30, 2, true]] },
  ],
  faq: [
    { value: "accordion", label: "Lipat-buka", description: "Jawaban muncul saat diklik", wire: [[6, 6, 48, 7], [6, 15, 48, 7], [6, 24, 48, 7], [10, 9, 24, 1, true], [10, 18, 28, 1, true], [10, 27, 20, 1, true]] },
    { value: "open", label: "Terbuka semua", description: "Pertanyaan dan jawaban langsung terbaca", wire: [[6, 6, 30, 2, true], [6, 10, 46, 1], [6, 13, 40, 1], [6, 20, 34, 2, true], [6, 24, 46, 1], [6, 27, 38, 1]] },
  ],
  testimonials: [
    { value: "cards", label: "Kartu", description: "Beberapa kutipan berdampingan", wire: [...card(2, 8, 17, 24), ...card(21, 8, 17, 24), ...card(40, 8, 17, 24)] },
    { value: "featured", label: "Kutipan besar", description: "Kutipan lebar di tengah", wire: [[12, 6, 36, 3, true], [10, 12, 40, 2], [14, 17, 32, 2], [22, 26, 16, 2, true], [24, 30, 12, 1]] },
  ],
} as const satisfies {
  features: BlockVariantMeta<FeaturesVariant>[];
  stats: BlockVariantMeta<StatsVariant>[];
  gallery: BlockVariantMeta<GalleryVariant>[];
  faq: BlockVariantMeta<FaqVariant>[];
  testimonials: BlockVariantMeta<TestimonialsVariant>[];
};

export type BlockVariantKind = keyof typeof BLOCK_VARIANTS;

type VariantOf = {
  features: FeaturesVariant;
  stats: StatsVariant;
  gallery: GalleryVariant;
  faq: FaqVariant;
  testimonials: TestimonialsVariant;
};

export function hasBlockVariants(kind: string): kind is BlockVariantKind {
  return kind in BLOCK_VARIANTS;
}

/** Varian pertama tiap blok = tampilan bawaan. */
export function defaultBlockVariant<K extends BlockVariantKind>(kind: K): VariantOf[K] {
  return BLOCK_VARIANTS[kind][0].value as VariantOf[K];
}

export function blockVariantMeta(
  kind: BlockVariantKind,
  value: string,
): BlockVariantMeta<string> | undefined {
  return (BLOCK_VARIANTS[kind] as readonly BlockVariantMeta<string>[]).find((v) => v.value === value);
}

/**
 * Jepit nilai varian ke yang dikenal (dan diizinkan pack, bila ada daftar izin).
 * Nilai asing menjadi `undefined` sehingga renderer memakai tampilan bawaan.
 */
export function cleanBlockVariant<K extends BlockVariantKind>(
  kind: K,
  raw: unknown,
  allowed?: readonly string[],
): VariantOf[K] | undefined {
  if (typeof raw !== "string") return undefined;
  const known = (BLOCK_VARIANTS[kind] as readonly BlockVariantMeta<string>[]).some((v) => v.value === raw);
  if (!known) return undefined;
  if (allowed && !allowed.includes(raw)) return undefined;
  return raw as VariantOf[K];
}

export type BlockVariantAllowlist = Partial<Record<BlockVariantKind, readonly string[]>>;

/** Jepit `variant` sebuah blok ke yang dikenal dan diizinkan pack; blok tanpa varian dikembalikan apa adanya. */
export function clampSectionVariant<S extends { kind: string; variant?: unknown }>(
  section: S,
  allow?: BlockVariantAllowlist,
): S {
  if (!hasBlockVariants(section.kind)) return section;
  const allowed = allow?.[section.kind];
  let v: string | undefined = cleanBlockVariant(section.kind, section.variant, allowed);
  // Bila varian bawaan sendiri tidak diizinkan, jatuhkan ke varian pertama yang diizinkan (bukan ke bawaan terlarang).
  if (v === undefined && allowed && !allowed.includes(defaultBlockVariant(section.kind))) {
    v = (BLOCK_VARIANTS[section.kind] as readonly BlockVariantMeta<string>[]).find((m) =>
      allowed.includes(m.value),
    )?.value;
  }
  return v === section.variant ? section : { ...section, variant: v };
}

/** Gabungkan dua daftar izin (mis. pack dan manifest): irisan per blok; yang hanya ada di satu sisi dipakai apa adanya. */
export function mergeVariantAllowlists(
  a?: BlockVariantAllowlist,
  b?: BlockVariantAllowlist,
): BlockVariantAllowlist | undefined {
  if (!a) return b;
  if (!b) return a;
  const out: BlockVariantAllowlist = {};
  for (const k of Object.keys(BLOCK_VARIANTS) as BlockVariantKind[]) {
    const x = a[k];
    const y = b[k];
    if (x && y) out[k] = x.filter((v) => y.includes(v));
    else if (x || y) out[k] = x ?? y;
  }
  return out;
}

/** Baca daftar izin dari JSON tak tepercaya: hanya blok dan varian yang dikenal yang lolos. */
export function parseBlockVariantAllowlist(raw: unknown): BlockVariantAllowlist | undefined {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return undefined;
  const out: BlockVariantAllowlist = {};
  for (const k of Object.keys(BLOCK_VARIANTS) as BlockVariantKind[]) {
    const v = (raw as Record<string, unknown>)[k];
    if (!Array.isArray(v)) continue;
    const known = (BLOCK_VARIANTS[k] as readonly BlockVariantMeta<string>[]).map((m) => m.value);
    const list = [...new Set(v.filter((x): x is string => typeof x === "string" && known.includes(x)))];
    if (list.length) out[k] = list;
  }
  return Object.keys(out).length ? out : undefined;
}
