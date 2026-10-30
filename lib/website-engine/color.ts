type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function rgbToHex([r, g, b]: Rgb): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

function luminance([r, g, b]: Rgb): number {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrastRatio(a: string, b: string): number {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  if (!ra || !rb) return 1;
  const [hi, lo] = [luminance(ra), luminance(rb)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Gelapkan warna sampai kontrasnya terhadap putih memenuhi `min` (WCAG AA teks normal = 4.5).
 * Tombol dan judul situs memakai teks putih di atas warna utama, jadi warna terang dari logo harus disesuaikan.
 */
export function ensureReadableOnWhite(hex: string, min = 4.5): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  let cur = rgb;
  for (let i = 0; i < 40 && contrastRatio(rgbToHex(cur), "#ffffff") < min; i++) {
    cur = [cur[0] * 0.92, cur[1] * 0.92, cur[2] * 0.92];
  }
  return rgbToHex(cur);
}

/** Warna aksen (judul) = versi gelap dari warna utama dengan kontras tinggi di atas putih. */
export function deriveAccent(primaryHex: string): string {
  const rgb = hexToRgb(primaryHex);
  if (!rgb) return "#0f172a";
  return ensureReadableOnWhite(rgbToHex([rgb[0] * 0.45, rgb[1] * 0.45, rgb[2] * 0.45]), 7);
}

function saturationValue([r, g, b]: Rgb): { s: number; v: number } {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  return { s: max === 0 ? 0 : (max - min) / max, v: max };
}

/**
 * Warna dominan yang "berwarna" dari piksel RGBA (mis. `ImageData.data`): piksel transparan, putih,
 * hitam, dan abu-abu dilewati karena itu latar logo, bukan identitas warnanya. `null` bila logo tidak berwarna.
 */
export function dominantColorFromPixels(
  data: ArrayLike<number>,
  step = 4,
): string | null {
  const buckets = new Map<number, { w: number; r: number; g: number; b: number }>();
  for (let i = 0; i + 3 < data.length; i += 4 * Math.max(1, step)) {
    if (data[i + 3] < 128) continue;
    const rgb: Rgb = [data[i], data[i + 1], data[i + 2]];
    const { s, v } = saturationValue(rgb);
    if (s < 0.25 || v < 0.2 || v > 0.97) continue;
    const key = ((rgb[0] >> 4) << 8) | ((rgb[1] >> 4) << 4) | (rgb[2] >> 4);
    const b = buckets.get(key) ?? { w: 0, r: 0, g: 0, b: 0 };
    b.w += s;
    b.r += rgb[0] * s;
    b.g += rgb[1] * s;
    b.b += rgb[2] * s;
    buckets.set(key, b);
  }
  let best: { w: number; r: number; g: number; b: number } | null = null;
  for (const b of buckets.values()) if (!best || b.w > best.w) best = b;
  if (!best || best.w === 0) return null;
  return rgbToHex([best.r / best.w, best.g / best.w, best.b / best.w]);
}
