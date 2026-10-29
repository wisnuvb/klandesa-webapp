/** Kertas, margin, dan font surat. F4/Folio adalah standar tata naskah dinas desa (Perbup), A4 pilihan lain. */

export const PAPER_SIZES = {
  F4: { label: "F4 / Folio (215 × 330 mm)", widthMm: 215, heightMm: 330 },
  A4: { label: "A4 (210 × 297 mm)", widthMm: 210, heightMm: 297 },
  Letter: { label: "Letter (216 × 279 mm)", widthMm: 215.9, heightMm: 279.4 },
  Legal: { label: "Legal (216 × 356 mm)", widthMm: 215.9, heightMm: 355.6 },
} as const;
export type PaperSizeId = keyof typeof PAPER_SIZES;
export const PAPER_SIZE_IDS = Object.keys(PAPER_SIZES) as [PaperSizeId, ...PaperSizeId[]];
export const DEFAULT_PAPER: PaperSizeId = "F4";

export type MarginMm = { top: number; right: number; bottom: number; left: number };

export const MARGIN_PRESETS = {
  normal: { label: "Normal", margin: { top: 20, right: 20, bottom: 20, left: 25 } },
  narrow: { label: "Sempit", margin: { top: 15, right: 15, bottom: 15, left: 15 } },
  wide: { label: "Lebar", margin: { top: 25, right: 25, bottom: 25, left: 30 } },
} as const satisfies Record<string, { label: string; margin: MarginMm }>;
export type MarginPresetId = keyof typeof MARGIN_PRESETS;

export const FONTS = {
  times: { label: "Times New Roman", css: '"Times New Roman", Times, serif' },
  arial: { label: "Arial", css: "Arial, Helvetica, sans-serif" },
  bookman: { label: "Bookman Old Style", css: '"Bookman Old Style", Bookman, "URW Bookman", serif' },
  calibri: { label: "Calibri", css: 'Calibri, Carlito, "Segoe UI", sans-serif' },
} as const;
export type FontId = keyof typeof FONTS;
export const FONT_IDS = Object.keys(FONTS) as [FontId, ...FontId[]];

export const LINE_HEIGHTS = [1, 1.15, 1.5, 2] as const;

/** Ukuran area tulis (mm) setelah margin dikurangi; dipakai untuk indikator "teks meluber". */
export function contentAreaMm(
  size: PaperSizeId,
  orientation: "portrait" | "landscape",
  margin: MarginMm,
): { widthMm: number; heightMm: number } {
  const p = PAPER_SIZES[size];
  const w = orientation === "portrait" ? p.widthMm : p.heightMm;
  const h = orientation === "portrait" ? p.heightMm : p.widthMm;
  return {
    widthMm: Math.max(0, w - margin.left - margin.right),
    heightMm: Math.max(0, h - margin.top - margin.bottom),
  };
}
