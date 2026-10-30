/**
 * Struktur sheet: cari baris header (judul laporan di atas tabel dibolehkan), ratakan header bertingkat /
 * sel gabungan, bersihkan baris sampah (kosong, JUMLAH, header berulang), dan klasifikasikan peran sheet.
 */
import { bestHeaderScore, canonicalHeader, type Cell, type ColumnInfo } from "./mapper";
import { parseDateLoose } from "./nik-date";
import { normalizeText } from "./text";

export interface MergeRange {
  r1: number;
  c1: number;
  r2: number;
  c2: number;
}

export interface SheetGrid {
  name: string;
  rows: Cell[][];
  merges: MergeRange[];
}

export type SheetRole = "master" | "split" | "deceased" | "moved" | "auxiliary";

export const SHEET_ROLE_LABEL: Record<SheetRole, string> = {
  master: "Data induk",
  split: "Pecahan per RW/RT (kemungkinan duplikat)",
  deceased: "Meninggal",
  moved: "Pindah",
  auxiliary: "Daftar bantu (bukan data induk)",
};

export interface ParsedSheet {
  name: string;
  /** Indeks baris (0-based) header utama pada grid asli. */
  headerRow: number;
  /** Indeks baris pertama data (0-based). */
  dataStart: number;
  headers: string[];
  columns: ColumnInfo[];
  /** Baris data bersih, dengan nomor baris Excel (1-based). */
  dataRows: Array<{ srcRow: number; cells: Cell[] }>;
  role: SheetRole;
  skipped: { empty: number; summary: number; repeatedHeader: number };
}

const isEmptyCell = (c: Cell | undefined) => c === null || c === undefined || String(c).trim() === "";
const isTextCell = (c: Cell | undefined) => typeof c === "string" && c.trim() !== "";

function cellAt(grid: SheetGrid, r: number, c: number): Cell {
  return grid.rows[r]?.[c] ?? null;
}

/** Nilai sel dengan pengisian sel gabungan (hanya untuk baris header). */
function headerCell(grid: SheetGrid, r: number, c: number): string {
  const own = cellAt(grid, r, c);
  if (!isEmptyCell(own)) return String(own).replace(/\s*[\r\n]+\s*/g, " ").trim();
  for (const m of grid.merges) {
    if (r >= m.r1 && r <= m.r2 && c >= m.c1 && c <= m.c2) {
      const tl = cellAt(grid, m.r1, m.c1);
      if (!isEmptyCell(tl)) return String(tl).replace(/\s*[\r\n]+\s*/g, " ").trim();
    }
  }
  return "";
}

function rowHeaderHits(grid: SheetGrid, r: number): number {
  const row = grid.rows[r] ?? [];
  let hits = 0;
  for (let c = 0; c < row.length; c++) {
    const v = headerCell(grid, r, c);
    if (!v || /^\d+$/.test(v)) continue;
    if (bestHeaderScore(v) >= 0.8) hits++;
  }
  return hits;
}

const looksLikeDataRow = (row: Cell[]): boolean =>
  row.some((c) => {
    if (typeof c === "number") return true;
    if (typeof c !== "string") return false;
    const s = c.trim();
    return /^\d{10,}$/.test(s) || (/\d/.test(s) && parseDateLoose(s) !== null);
  });

/** Cari baris header terbaik dalam ±30 baris pertama. */
export function detectHeaderRow(grid: SheetGrid): number {
  const limit = Math.min(grid.rows.length, 30);
  let best = -1;
  let bestHits = 0;
  for (let r = 0; r < limit; r++) {
    const hits = rowHeaderHits(grid, r);
    if (hits > bestHits) {
      best = r;
      bestHits = hits;
    }
  }
  if (best >= 0 && bestHits >= 2) return best;
  // Fallback: baris pertama yang tidak kosong dan didominasi teks
  for (let r = 0; r < limit; r++) {
    const row = grid.rows[r] ?? [];
    const filled = row.filter((c) => !isEmptyCell(c));
    if (filled.length >= 2 && filled.filter(isTextCell).length >= filled.length * 0.6) return r;
  }
  return 0;
}

const SUMMARY_RE = /^(jumlah|total|rekap|sub ?total|grand total)\b/i;

export function classifySheetRole(name: string): SheetRole {
  const n = normalizeText(name);
  if (/\b(meninggal|wafat|mati|kematian|deceased)\b/.test(n)) return "deceased";
  if (/\b(pindah|mutasi|keluar|pergi)\b/.test(n)) return "moved";
  if (/\b(blm|belum|rekam|ktp|vaksin|pekka|kia|stunting|bantuan|penerima|lansia|disabilitas|rekap|rekapitulasi|ringkasan|petunjuk|panduan|catatan|pivot|grafik)\b/.test(n)) {
    return "auxiliary";
  }
  if (/^(rw|rt|dusun|dsn)\b/.test(n)) return "split";
  return "master";
}

const isTwoLetterGenderMark = (s: string) => /^[lp]$/i.test(s.trim());

export function parseSheet(grid: SheetGrid): ParsedSheet {
  const headerRow = detectHeaderRow(grid);
  const width = Math.max(0, ...grid.rows.map((r) => r.length));

  // Baris sub-header langsung di bawah header utama (header bertingkat)
  let dataStart = headerRow + 1;
  const headerRows = [headerRow];
  for (let extra = 0; extra < 2; extra++) {
    const r = dataStart;
    const row = grid.rows[r];
    if (!row) break;
    const filled = row.map((_, c) => headerCell(grid, r, c)).filter(Boolean);
    if (filled.length === 0) break;
    if (looksLikeDataRow(row)) break;
    const texts = row.filter(isTextCell) as string[];
    const hits = rowHeaderHits(grid, r) + texts.filter(isTwoLetterGenderMark).length;
    if (texts.length >= 1 && hits >= Math.max(1, Math.floor(texts.length * 0.5))) {
      headerRows.push(r);
      dataStart = r + 1;
    } else break;
  }

  const headers: string[] = [];
  for (let c = 0; c < width; c++) {
    const parts: string[] = [];
    for (const r of headerRows) {
      const p = headerCell(grid, r, c);
      if (p && !parts.some((x) => canonicalHeader(x) === canonicalHeader(p))) parts.push(p);
    }
    headers.push(parts.join(" ").trim());
  }

  const skipped = { empty: 0, summary: 0, repeatedHeader: 0 };
  const dataRows: ParsedSheet["dataRows"] = [];
  for (let r = dataStart; r < grid.rows.length; r++) {
    const cells = grid.rows[r] ?? [];
    if (cells.every(isEmptyCell)) {
      skipped.empty++;
      continue;
    }
    const firstText = cells.find(isTextCell);
    // Baris total: diawali JUMLAH/TOTAL dan hampir kosong (nama orang yang kebetulan berawalan "Total" tidak ikut terbuang)
    if (typeof firstText === "string" && SUMMARY_RE.test(firstText.trim()) && cells.filter((c) => !isEmptyCell(c)).length <= 3) {
      skipped.summary++;
      continue;
    }
    // Header yang diulang di tengah data (mis. tiap halaman cetak): sel harus SAMA dengan header di kolom yang sama.
    const comparable = headers.filter((h) => h).length;
    let sameAsHeader = 0;
    cells.forEach((c, ci) => {
      if (isTextCell(c) && headers[ci] && canonicalHeader(c) === canonicalHeader(headers[ci])) sameAsHeader++;
    });
    if (comparable >= 3 && sameAsHeader >= Math.max(3, Math.ceil(comparable * 0.6))) {
      skipped.repeatedHeader++;
      continue;
    }
    dataRows.push({ srcRow: r + 1, cells });
  }

  const columns: ColumnInfo[] = headers.map((header, index) => {
    const samples: Cell[] = [];
    for (const { cells } of dataRows) {
      const v = cells[index];
      if (!isEmptyCell(v)) samples.push(v as Cell);
      if (samples.length >= 300) break;
    }
    return { index, header, samples };
  });

  return {
    name: grid.name,
    headerRow,
    dataStart,
    headers,
    columns,
    dataRows,
    role: classifySheetRole(grid.name),
    skipped,
  };
}
