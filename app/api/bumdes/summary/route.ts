import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toJSONSafe } from "@/utils/json";
import { loadBumdesApiContext, sumTransactions } from "@/lib/bumdes/api-context";

export async function GET(req: NextRequest) {
  const loaded = await loadBumdesApiContext(req, { requireExisting: true });
  if (!loaded.ok) return loaded.response;
  if ("needsBootstrap" in loaded && loaded.needsBootstrap) {
    return NextResponse.json({ error: "BUMDes belum dibuat" }, { status: 404 });
  }

  const bumdesId = loaded.ctx.bumdes!.id;
  const [overall, units, byUnit] = await Promise.all([
    sumTransactions(bumdesId),
    prisma.bumdesUnit.findMany({
      where: { bumdesId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, category: true, status: true },
    }),
    prisma.bumdesTransaction.groupBy({
      by: ["unitId", "direction"],
      where: { bumdesId },
      _sum: { amount: true },
    }),
  ]);

  const unitStats = units.map((unit) => {
    const income = Number(
      byUnit.find((r) => r.unitId === unit.id && r.direction === "income")?._sum.amount ?? 0,
    );
    const expense = Number(
      byUnit.find((r) => r.unitId === unit.id && r.direction === "expense")?._sum.amount ?? 0,
    );
    return {
      ...unit,
      totalIncome: income,
      totalExpense: expense,
      netProfit: income - expense,
    };
  });

  return NextResponse.json({
    success: true,
    data: toJSONSafe({
      overall,
      units: unitStats,
    }),
  });
}
