import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { collectVillageMetrics } from "@/lib/sdgs/collect-metrics";
import { computeSdgsDashboard } from "@/lib/sdgs/scoring-engine";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;

    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const [assets, projects, disasters, { metrics, idmVillageCode }] =
      await Promise.all([
        prisma.villageAsset.findMany({
          where: { villageId: village.id, status: "active" },
        }),
        prisma.infrastructureProject.findMany({
          where: { villageId: village.id, status: { not: "cancelled" } },
        }),
        prisma.disasterPoint.findMany({
          where: { villageId: village.id },
        }),
        collectVillageMetrics(village.id),
      ]);

    const dashboard = computeSdgsDashboard(metrics, idmVillageCode);

    const center =
      village.absensiOfficeLat != null && village.absensiOfficeLng != null
        ? { lat: village.absensiOfficeLat, lng: village.absensiOfficeLng }
        : null;

    const markers = [
      ...assets
        .filter((a) => a.lat != null && a.lng != null)
        .map((a) => ({
          id: `asset-${a.id}`,
          lat: a.lat as number,
          lng: a.lng as number,
          label: a.name,
          type: "asset" as const,
          assetType: a.assetType,
        })),
      ...projects
        .filter((p) => p.lat != null && p.lng != null)
        .map((p) => ({
          id: `project-${p.id}`,
          lat: p.lat as number,
          lng: p.lng as number,
          label: p.title,
          type: "project" as const,
          projectType: p.projectType,
        })),
      ...disasters
        .filter((d) => d.lat != null && d.lng != null)
        .map((d) => ({
          id: `disaster-${d.id}`,
          lat: d.lat as number,
          lng: d.lng as number,
          label: d.name,
          type: "disaster" as const,
          riskLevel: d.riskLevel,
        })),
    ];

    return NextResponse.json({
      center,
      markers,
      heatmap: dashboard.heatmap,
      stats: {
        assetCount: assets.length,
        projectCount: projects.length,
        disasterCount: disasters.length,
      },
    });
  } catch (e) {
    console.error("GET /api/gis/map-data", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
