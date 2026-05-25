import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
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

    const [plotCount, activeCycles, harvestAgg, agriPotentials] = await Promise.all([
      prisma.farmPlot.count({ where: { villageId: village.id, status: "active" } }),
      prisma.cropCycle.count({
        where: { plot: { villageId: village.id }, status: { in: ["planted", "growing"] } },
      }),
      prisma.harvestRecord.aggregate({
        where: { cycle: { plot: { villageId: village.id } } },
        _sum: { quantityKg: true },
        _count: { _all: true },
      }),
      prisma.potential.count({
        where: {
          villageId: village.id,
          OR: [
            { category: { contains: "Pertanian" } },
            { category: { contains: "pertanian" } },
            { category: { contains: "Tani" } },
          ],
        },
      }),
    ]);

    return NextResponse.json({
      stats: {
        plotCount,
        activeCycles,
        harvestCount: harvestAgg._count._all,
        totalHarvestKg: harvestAgg._sum.quantityKg ?? 0,
        agriculturePotentialCount: agriPotentials,
      },
    });
  } catch (e) {
    console.error("GET /api/pertanian/stats", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
