/** Unduh laporan LAMPID dari data yang sudah termuat di layar (tanpa permintaan ke server). */
import { downloadBlob } from "@/lib/statistics/download";
import { formatLongDate } from "@/lib/statistics/export";
import { buildLampidCsv, buildLampidSheets, lampidFileName } from "./lampid-export";
import type { LampidResponse } from "./lampid";

export async function exportLampid(format: "excel" | "csv", data: LampidResponse): Promise<void> {
  const { report, village } = data;
  if (format === "csv") {
    downloadBlob(new Blob([buildLampidCsv(report)], { type: "text/csv;charset=utf-8" }), lampidFileName(village.name, report.month, "csv"));
    return;
  }
  // xlsx cukup besar; baru dimuat saat benar-benar dipakai.
  const XLSX = await import("xlsx");
  const book = XLSX.utils.book_new();
  for (const sheet of buildLampidSheets(report, village.name, `Disusun ${formatLongDate(new Date(data.generatedAt))}`)) {
    const ws = XLSX.utils.aoa_to_sheet(sheet.rows);
    ws["!cols"] = sheet.widths.map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(book, ws, sheet.name);
  }
  const bytes = XLSX.write(book, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  downloadBlob(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), lampidFileName(village.name, report.month, "xlsx"));
}
