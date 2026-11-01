/**
 * Pembaca XLSX terbatas untuk impor IDM (dijalankan di peramban). Memakai `xlsx` 0.18.5, versi yang rentan
 * CVE-2023-30533 (prototype pollution) dan CVE-2024-22363 (ReDoS) pada berkas tak tepercaya; dependensi sengaja tidak diganti
 * (dipakai juga impor warga). Mitigasi di sini hanya membatasi dampak: jumlah baris yang diurai (`sheetRows`), kolom, dan lembar.
 * Saran: perbarui ke SheetJS CDN >= 0.20.2 atau pengganti saat dependensi diperbarui; hanya impor berkas dari sumber yang dipercaya.
 */
import * as XLSX from "xlsx";
import type { Grid } from "./map";

export const XLSX_LIMITS = { maxRows: 100_000, maxCols: 200, maxSheets: 10 } as const;

export class TooBigError extends Error {}

export function readWorkbookLimited(data: ArrayBuffer, limits: { maxRows: number; maxCols: number; maxSheets: number } = XLSX_LIMITS): { name: string; grid: Grid }[] {
  const wb = XLSX.read(data, { type: "array", cellDates: false, cellText: false, cellNF: false, cellHTML: false, cellFormula: false, sheetRows: limits.maxRows + 1 });
  const out: { name: string; grid: Grid }[] = [];
  for (const name of wb.SheetNames.slice(0, limits.maxSheets)) {
    const ws = wb.Sheets[name];
    if (!ws || !ws["!ref"]) continue;
    const range = XLSX.utils.decode_range(ws["!ref"]);
    if (range.e.r - range.s.r + 1 > limits.maxRows) throw new TooBigError(`Lembar "${name}" melebihi ${limits.maxRows.toLocaleString("id-ID")} baris.`);
    if (range.e.c - range.s.c + 1 > limits.maxCols) range.e.c = range.s.c + limits.maxCols - 1;
    const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(ws, { header: 1, raw: true, defval: null, blankrows: false, range });
    out.push({ name, grid: rows.map((r) => r.map((c) => (c === undefined || (c as unknown) instanceof Date ? null : c))) });
  }
  return out;
}
