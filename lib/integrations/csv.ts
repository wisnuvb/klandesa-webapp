import { csvSafeCell } from "../csv-safe";

/** Berkas ekspor ke sistem eksternal dibuka di spreadsheet: sel diawali rumus dinetralkan (lib/csv-safe). */
export function csvEscape(v: string | number | null | undefined): string {
  return csvSafeCell(v);
}

export function rowsToCsv(
  headers: string[],
  rows: Array<Record<string, string | number | null>>,
): string {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h] ?? null)).join(","));
  }
  return lines.join("\n");
}
