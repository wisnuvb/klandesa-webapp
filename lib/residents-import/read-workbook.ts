/** Pembaca workbook (SheetJS) → grid per sheet. Tanggal dikonversi dari serial tanpa pengaruh zona waktu. */
import * as XLSX from "xlsx";
import { excelSerialToIso } from "./nik-date";
import type { Cell } from "./mapper";
import type { MergeRange, SheetGrid } from "./sheet-structure";

const MAX_COLS = 200;

function cellValue(cell: XLSX.CellObject | undefined): Cell {
  if (!cell || cell.v === undefined || cell.v === null) return null;
  switch (cell.t) {
    case "n": {
      const fmt = typeof cell.z === "string" ? cell.z : "";
      if (fmt && XLSX.SSF.is_date(fmt)) return excelSerialToIso(cell.v as number) ?? (cell.v as number);
      // Format "00" / "000" (RT/RW dengan nol di depan): pakai teks tampilan
      if (/^0+$/.test(fmt) && cell.w) return cell.w;
      return cell.v as number;
    }
    case "b":
      return cell.v ? "Y" : "N";
    case "d":
      return cell.v instanceof Date && !Number.isNaN(cell.v.getTime())
        ? `${cell.v.getFullYear()}-${String(cell.v.getMonth() + 1).padStart(2, "0")}-${String(cell.v.getDate()).padStart(2, "0")}`
        : null;
    case "e":
      return null;
    default:
      return String(cell.v);
  }
}

export function readWorkbookGrids(data: ArrayBuffer | Uint8Array | string, kind?: "array" | "binary"): SheetGrid[] {
  const wb = XLSX.read(data, {
    type: kind ?? (typeof data === "string" ? "binary" : "array"),
    cellDates: false,
    cellNF: true,
    cellText: true,
  });
  const grids: SheetGrid[] = [];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws || !ws["!ref"]) {
      grids.push({ name, rows: [], merges: [] });
      continue;
    }
    const range = XLSX.utils.decode_range(ws["!ref"]);
    const lastCol = Math.min(range.e.c, range.s.c + MAX_COLS - 1);
    const rows: Cell[][] = [];
    for (let r = range.s.r; r <= range.e.r; r++) {
      const row: Cell[] = [];
      for (let c = range.s.c; c <= lastCol; c++) {
        row.push(cellValue(ws[XLSX.utils.encode_cell({ r, c })]));
      }
      rows.push(row);
    }
    const merges: MergeRange[] = (ws["!merges"] ?? []).map((m) => ({
      r1: m.s.r - range.s.r,
      c1: m.s.c - range.s.c,
      r2: m.e.r - range.s.r,
      c2: m.e.c - range.s.c,
    }));
    grids.push({ name, rows, merges });
  }
  return grids;
}
