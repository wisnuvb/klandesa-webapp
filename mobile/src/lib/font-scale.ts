/** Ukuran huruf dalam aplikasi (di atas pengaturan ukuran huruf sistem). Logika murni agar mudah dites. */

export const FONT_SCALES = [
  { key: 'normal', label: 'Normal', scale: 1 },
  { key: 'besar', label: 'Besar', scale: 1.15 },
  { key: 'sangat-besar', label: 'Sangat besar', scale: 1.3 },
] as const;

export type FontScaleKey = (typeof FONT_SCALES)[number]['key'];

/** RN memakai 14 bila Text tidak menyebut fontSize. */
export const DEFAULT_FONT_SIZE = 14;

export function parseFontScale(raw: unknown): FontScaleKey {
  return FONT_SCALES.some((s) => s.key === raw) ? (raw as FontScaleKey) : 'normal';
}

export function scaleOf(key: FontScaleKey): number {
  return FONT_SCALES.find((s) => s.key === key)?.scale ?? 1;
}

type Flat = { fontSize?: unknown; lineHeight?: unknown } | null | undefined;

/**
 * Gaya tambahan untuk memperbesar teks. Mengembalikan null bila tidak perlu (skala 1, atau Text bersarang tanpa fontSize
 * yang mewarisi ukuran induknya). lineHeight ikut diperbesar agar baris tidak terpotong.
 */
export function scaledTextStyle(flat: Flat, scale: number, nested: boolean): { fontSize: number; lineHeight?: number } | null {
  if (!(scale > 1)) return null;
  const size = typeof flat?.fontSize === 'number' ? flat.fontSize : null;
  if (size == null && nested) return null;
  const out: { fontSize: number; lineHeight?: number } = { fontSize: round((size ?? DEFAULT_FONT_SIZE) * scale) };
  if (typeof flat?.lineHeight === 'number') out.lineHeight = round(flat.lineHeight * scale);
  return out;
}

const round = (n: number) => Math.round(n * 10) / 10;
