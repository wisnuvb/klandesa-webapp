import { collectVillageMetrics } from "@/lib/sdgs/collect-metrics";
import { computeSdgsDashboard } from "@/lib/sdgs/scoring-engine";
import { prisma } from "@/lib/prisma";
import type { IntegrationExportFormat, IntegrationExportResult } from "../types";

export async function exportSdgsPortal(
  villageId: number,
  format: IntegrationExportFormat,
): Promise<IntegrationExportResult> {
  if (format !== "json") {
    throw new Error("SDGs portal hanya mendukung format JSON");
  }

  const village = await prisma.village.findUnique({
    where: { id: villageId },
    select: { code: true, name: true, regency: true, province: true },
  });
  if (!village) throw new Error("Desa tidak ditemukan");

  const { metrics, idmVillageCode } = await collectVillageMetrics(villageId);
  const dashboard = computeSdgsDashboard(metrics, idmVillageCode);

  const goals = dashboard.goals.map((g) => ({
    goal_id: g.goalId,
    slug: g.slug,
    title: g.shortTitle,
    score: g.score,
    status: g.status,
    indicators: g.indicators.map((i) => ({
      label: i.label,
      value: i.value,
    })),
  }));

  const body = {
    schema: "sdgs_score_v1",
    exportedAt: new Date().toISOString(),
    village: {
      code: village.code,
      name: village.name,
      regency: village.regency,
      province: village.province,
      idmVillageCode,
    },
    summary: {
      overallScore: dashboard.overallScore,
      goalsWithData: dashboard.goals.filter((g) => g.score != null).length,
      goalsNeedAttention: dashboard.goals.filter((g) => g.status === "low").length,
    },
    goals,
    rtRwHeatmap: dashboard.heatmap ?? [],
  };

  const stamp = new Date().toISOString().slice(0, 10);
  return {
    adapterId: "sdgs_portal",
    format: "json",
    recordCount: goals.length,
    filename: `sdgs_${village.code}_${stamp}.json`,
    mimeType: "application/json",
    body,
    meta: {
      overallScore: dashboard.overallScore,
      idmVillageCode,
    },
  };
}
