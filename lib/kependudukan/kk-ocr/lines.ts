/**
 * Dari kata-kata hasil OCR (dengan kotak pembatas) menjadi baris teks. Celah lebar antarkata ditandai dua spasi,
 * sehingga kolom tabel KK yang berdampingan (mis. nama ayah dan nama ibu) masih bisa dipisahkan penguraian.
 */
export interface OcrWord {
  text: string;
  x0: number;
  x1: number;
}

export interface OcrLine {
  text: string;
}

/** Celah lebih lebar dari ini (kali lebar rata-rata satu huruf pada baris itu) dianggap batas kolom. */
export const COLUMN_GAP_FACTOR = 2.2;

export function lineFromWords(words: readonly OcrWord[]): OcrLine {
  const ws = words.filter((w) => w.text.trim() !== "").sort((a, b) => a.x0 - b.x0);
  if (ws.length === 0) return { text: "" };
  const chars = ws.reduce((n, w) => n + w.text.length, 0);
  const width = ws.reduce((n, w) => n + Math.max(0, w.x1 - w.x0), 0);
  const charWidth = chars > 0 && width > 0 ? width / chars : 0;
  let out = ws[0].text;
  for (let i = 1; i < ws.length; i++) {
    const gap = ws[i].x0 - ws[i - 1].x1;
    out += charWidth > 0 && gap > charWidth * COLUMN_GAP_FACTOR ? "  " : " ";
    out += ws[i].text;
  }
  return { text: out };
}
