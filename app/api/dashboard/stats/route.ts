import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { aggregateResidents } from "@/lib/dashboard/resident-stats";

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const [residents, totalOfficials, totalMailServices, budgetSum] =
      await Promise.all([
        aggregateResidents(village.id),
        prisma.official.count({ where: { villageId: village.id } }),
        prisma.mailService.count({ where: { villageId: village.id } }),
        prisma.budget.aggregate({
          where: { villageId: village.id, status: "active" },
          _sum: { remainingAmount: true },
        }),
      ]);

    return NextResponse.json({
      totals: {
        residents: residents.total,
        households: residents.households,
        officials: totalOfficials,
        mailServices: totalMailServices,
        budgetAvailable: Number(budgetSum._sum.remainingAmount ?? 0),
      },
      charts: {
        gender: [
          { name: "Laki-laki", value: residents.male, color: "#0f766e" },
          { name: "Perempuan", value: residents.female, color: "#14b8a6" },
        ],
        age: residents.age,
        education: residents.education,
      },
      statusDesa: {
        sdgs: {
          dashboardUrl: "https://dashboard-sdgs.kemendesa.go.id/",
        },
      },
    });
  } catch (err) {
    console.error("GET /api/dashboard/stats error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
