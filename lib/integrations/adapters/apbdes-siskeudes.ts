import { prisma } from "@/lib/prisma";
import { rowsToCsv } from "../csv";
import type { IntegrationExportFormat, IntegrationExportResult } from "../types";

const HEADERS = [
  "kode_desa",
  "tahun",
  "kode_anggaran",
  "kategori",
  "sub_kategori",
  "deskripsi",
  "anggaran",
  "realisasi",
  "sisa",
  "persen_realisasi",
  "sdg_goals",
  "status",
];

export async function exportApbdesSiskeudes(
  villageId: number,
  format: IntegrationExportFormat,
): Promise<IntegrationExportResult> {
  const village = await prisma.village.findUnique({
    where: { id: villageId },
    select: { code: true, name: true },
  });
  if (!village) throw new Error("Desa tidak ditemukan");

  const budgets = await prisma.budget.findMany({
    where: { villageId },
    orderBy: [{ year: "desc" }, { budgetCode: "asc" }],
  });

  const rows = budgets.map((b) => ({
    kode_desa: village.code,
    tahun: b.year,
    kode_anggaran: b.budgetCode,
    kategori: b.category,
    sub_kategori: b.subCategory,
    deskripsi: b.description,
    anggaran: Number(b.budgetAmount),
    realisasi: Number(b.realizedAmount),
    sisa: Number(b.remainingAmount),
    persen_realisasi: b.realizationPercent,
    sdg_goals: JSON.stringify(b.sdgGoalIds ?? []),
    status: b.status,
  }));

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `apbdes_${village.code}_${stamp}.${format}`;

  if (format === "json") {
    return {
      adapterId: "apbdes_siskeudes",
      format,
      recordCount: rows.length,
      filename,
      mimeType: "application/json",
      body: {
        schema: "apbdes_v1",
        exportedAt: new Date().toISOString(),
        village: { code: village.code, name: village.name },
        records: rows,
      },
      meta: { villageCode: village.code, yearRange: rows.map((r) => r.tahun) },
    };
  }

  return {
    adapterId: "apbdes_siskeudes",
    format,
    recordCount: rows.length,
    filename,
    mimeType: "text/csv; charset=utf-8",
    body: rowsToCsv(HEADERS, rows),
    meta: { villageCode: village.code },
  };
}
