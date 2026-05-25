import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toJSONSafe } from "@/utils/json";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { aggregateVillageBudgets } from "@/lib/finance/village-budget-aggregate";

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;

    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const [budgets, transactions] = await Promise.all([
      prisma.budget.findMany({
        where: { villageId: village.id },
        select: {
          id: true,
          villageId: true,
          year: true,
          category: true,
          subCategory: true,
          budgetAmount: true,
          realizedAmount: true,
          remainingAmount: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [{ year: "desc" }, { id: "desc" }],
      }),
      prisma.transaction.findMany({
        where: { villageId: village.id, type: "income" },
        select: {
          type: true,
          category: true,
          amount: true,
          transactionDate: true,
        },
      }),
    ]);

    const data = aggregateVillageBudgets(village.id, budgets, transactions);

    return NextResponse.json({
      success: true,
      data: toJSONSafe(data),
    });
  } catch (err) {
    console.error("GET /api/finance/village-budgets error:", err);
    return NextResponse.json(
      { error: "Gagal memuat data anggaran desa" },
      { status: 500 },
    );
  }
}
