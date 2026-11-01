/** Ekspor rekap statistik dari data yang sudah termuat di layar (tanpa permintaan ke server). */
import { buildStatisticCsv, buildStatisticSheets, statisticFileName } from "./export";
import { downloadBlob } from "./download";
import type { StatisticsData } from "./types";

export async function exportStatistics(
  format: "excel" | "csv",
  data: StatisticsData,
  villageName: string,
): Promise<void> {
  const generatedAt = new Date(data.dihitungPada);

  if (format === "csv") {
    downloadBlob(
      new Blob([buildStatisticCsv(data)], { type: "text/csv;charset=utf-8" }),
      statisticFileName(villageName, "csv", generatedAt),
    );
    return;
  }

  // xlsx cukup besar; baru dimuat saat benar-benar dipakai.
  const XLSX = await import("xlsx");
  const book = XLSX.utils.book_new();
  for (const sheet of buildStatisticSheets(data, { villageName, generatedAt })) {
    const ws = XLSX.utils.aoa_to_sheet(sheet.rows);
    ws["!cols"] = sheet.widths.map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(book, ws, sheet.name);
  }
  const bytes = XLSX.write(book, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  downloadBlob(
    new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    statisticFileName(villageName, "xlsx", generatedAt),
  );
}
