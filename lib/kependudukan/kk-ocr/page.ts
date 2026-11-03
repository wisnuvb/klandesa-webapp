/** Hasil halaman tesseract.js → baris teks. Struktur diketik longgar agar modul ini murni (tanpa mengimpor tesseract). */
import { lineFromWords, type OcrLine } from "./lines";

export interface PageLike {
  blocks:
    | Array<{
        paragraphs: Array<{
          lines: Array<{
            bbox: { y0: number; y1: number };
            words: Array<{ text: string; bbox: { x0: number; x1: number } }>;
          }>;
        }>;
      }>
    | null;
}

/**
 * Pakai pengelompokan baris dari tesseract (ia mengikuti kemiringan foto), urut dari atas ke bawah.
 * Pada halaman tabel dengan beberapa blok, urutan menurut titik tengah vertikal baris.
 */
export function pageToLines(page: PageLike): OcrLine[] {
  const rows: Array<{ cy: number; line: OcrLine }> = [];
  for (const b of page.blocks ?? []) {
    for (const p of b.paragraphs) {
      for (const l of p.lines) {
        const line = lineFromWords(l.words.map((w) => ({ text: w.text, x0: w.bbox.x0, x1: w.bbox.x1 })));
        if (line.text.trim()) rows.push({ cy: (l.bbox.y0 + l.bbox.y1) / 2, line });
      }
    }
  }
  return rows.sort((a, b) => a.cy - b.cy).map((r) => r.line);
}
