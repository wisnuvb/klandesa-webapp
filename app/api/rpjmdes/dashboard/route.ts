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

    const [planCount, activityCount, proposalCounts] = await Promise.all([
      prisma.rpjmdesPlan.count({ where: { villageId: village.id } }),
      prisma.rkpdesActivity.count({
        where: { plan: { villageId: village.id } },
      }),
      prisma.musdesProposal.groupBy({
        by: ["status"],
        where: { villageId: village.id },
        _count: { _all: true },
      }),
    ]);

    const proposalsByStatus = Object.fromEntries(
      proposalCounts.map((p) => [p.status, p._count._all]),
    );

    const topActivities = await prisma.rkpdesActivity.findMany({
      where: { plan: { villageId: village.id }, status: "planned" },
      orderBy: [{ priorityScore: "desc" }],
      take: 5,
      select: {
        id: true,
        title: true,
        year: true,
        priorityScore: true,
        sdgGoalIds: true,
      },
    });

    return NextResponse.json({
      stats: {
        planCount,
        activityCount,
        proposalsSubmitted: proposalsByStatus.submitted ?? 0,
        proposalsApproved: proposalsByStatus.approved ?? 0,
        proposalsRejected: proposalsByStatus.rejected ?? 0,
      },
      topPriorityActivities: topActivities.map((a) => ({
        id: a.id,
        title: a.title,
        year: a.year,
        priorityScore: a.priorityScore,
        sdgGoalIds: a.sdgGoalIds,
      })),
    });
  } catch (e) {
    console.error("GET /api/rpjmdes/dashboard", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
