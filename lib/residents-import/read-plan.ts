/** Baca workbook + susun rencana impor dalam satu langkah. */
import type { ColumnMapping } from "./batch";
import { planWorkbook, type PlannedSheet } from "./plan";
import { readWorkbookGrids } from "./read-workbook";

export function readAndPlan(data: ArrayBuffer, saved: Record<string, ColumnMapping> = {}): PlannedSheet[] {
  return planWorkbook(readWorkbookGrids(data, "array"), saved);
}
