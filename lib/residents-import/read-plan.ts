/** Baca workbook + susun rencana impor dalam satu langkah (dipakai Web Worker dan sebagai cadangan di thread utama). */
import type { ColumnMapping } from "./batch";
import { planWorkbook, type PlannedSheet } from "./plan";
import { readWorkbookGrids } from "./read-workbook";

export function readAndPlan(data: ArrayBuffer, saved: Record<string, ColumnMapping> = {}): PlannedSheet[] {
  return planWorkbook(readWorkbookGrids(data, "array"), saved);
}
