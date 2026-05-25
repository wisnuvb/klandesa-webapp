import { prisma } from "@/lib/prisma";
import { parseSdgGoalIds } from "@/lib/sdgs/parse-goals";
import { SDG_GOALS } from "@/lib/sdgs/goals";

export type SdgSpendingRow = {
  goalId: number;
  shortTitle: string;
  budgetAmount: number;
  realizedAmount: number;
  transactionAmount: number;
  totalSpending: number;
};

export type SdgSpendingSummary = {
  year: number;
  goals: SdgSpendingRow[];
  untaggedBudget: number;
  untaggedRealized: number;
  untaggedTransactions: number;
};

function toNum(v: unknown): number {
  if (v == null) return 0;
  return Number(v) || 0;
}

export async function aggregateSdgSpending(
  villageId: number,
  year: number,
): Promise<SdgSpendingSummary> {
  const [budgets, transactions] = await Promise.all([
    prisma.budget.findMany({
      where: { villageId, year },
      select: {
        budgetAmount: true,
        realizedAmount: true,
        sdgGoalIds: true,
      },
    }),
    prisma.transaction.findMany({
      where: {
        villageId,
        type: "expense",
        transactionDate: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
      select: { amount: true, sdgGoalIds: true },
    }),
  ]);

  const goalMap = new Map<number, SdgSpendingRow>();
  for (const g of SDG_GOALS) {
    goalMap.set(g.id, {
      goalId: g.id,
      shortTitle: g.shortTitle,
      budgetAmount: 0,
      realizedAmount: 0,
      transactionAmount: 0,
      totalSpending: 0,
    });
  }

  let untaggedBudget = 0;
  let untaggedRealized = 0;
  let untaggedTransactions = 0;

  for (const b of budgets) {
    const ids = parseSdgGoalIds(b.sdgGoalIds);
    const budgetAmt = toNum(b.budgetAmount);
    const realizedAmt = toNum(b.realizedAmount);
    if (ids.length === 0) {
      untaggedBudget += budgetAmt;
      untaggedRealized += realizedAmt;
      continue;
    }
    const share = 1 / ids.length;
    for (const id of ids) {
      const row = goalMap.get(id);
      if (!row) continue;
      row.budgetAmount += budgetAmt * share;
      row.realizedAmount += realizedAmt * share;
    }
  }

  for (const t of transactions) {
    const ids = parseSdgGoalIds(t.sdgGoalIds);
    const amt = toNum(t.amount);
    if (ids.length === 0) {
      untaggedTransactions += amt;
      continue;
    }
    const share = amt / ids.length;
    for (const id of ids) {
      const row = goalMap.get(id);
      if (!row) continue;
      row.transactionAmount += share;
    }
  }

  const goals = [...goalMap.values()].map((row) => ({
    ...row,
    budgetAmount: Math.round(row.budgetAmount),
    realizedAmount: Math.round(row.realizedAmount),
    transactionAmount: Math.round(row.transactionAmount),
    totalSpending: Math.round(row.realizedAmount + row.transactionAmount),
  }));

  return {
    year,
    goals,
    untaggedBudget: Math.round(untaggedBudget),
    untaggedRealized: Math.round(untaggedRealized),
    untaggedTransactions: Math.round(untaggedTransactions),
  };
}
