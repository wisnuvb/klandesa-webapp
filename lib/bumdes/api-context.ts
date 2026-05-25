import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import type { Bumdes, Village } from "@prisma/client";
import {
  requireVillageApiContext,
  type VillageApiContext,
} from "@/lib/api-village-context";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";
import {
  canManageBumdes,
  fetchBumdesForVillage,
  isVillageBumdesElevated,
  requireBumdesManageResponse,
  requireBumdesReadResponse,
} from "@/lib/bumdes/access";

export type BumdesApiContext = {
  session: Session;
  userId: number;
  village: Village;
  bumdes: Bumdes;
  canManage: boolean;
};

export type BumdesBootstrapContext = {
  session: Session;
  userId: number;
  village: Village;
  bumdes: null;
  canManage: boolean;
};

export async function loadBumdesApiContext(
  req: NextRequest,
  options?: { requireExisting?: boolean },
): Promise<
  | { ok: true; ctx: BumdesApiContext }
  | { ok: true; ctx: BumdesBootstrapContext; needsBootstrap: true }
  | { ok: false; response: NextResponse }
> {
  const loaded = await requireVillageApiContext(req);
  if (!loaded.ok) return loaded;

  const { session, userId, village } = loaded.ctx as VillageApiContext;

  const readErr = requireBumdesReadResponse(session);
  if (readErr) return { ok: false, response: readErr };

  if (!isVillageSubscriptionActive(village)) {
    return { ok: false, response: subscriptionBlockedResponse(village) };
  }

  const bumdes = await fetchBumdesForVillage(village.id);
  const villageRole = session.user?.role;
  const canManage = canManageBumdes(villageRole);

  if (!bumdes) {
    if (options?.requireExisting && !isVillageBumdesElevated(villageRole)) {
      return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
    return {
      ok: true,
      ctx: { session, userId, village, bumdes: null, canManage },
      needsBootstrap: true,
    };
  }

  return {
    ok: true,
    ctx: { session, userId, village, bumdes, canManage },
  };
}

export function requireBumdesManage(ctx: { session: Session }): NextResponse | null {
  return requireBumdesManageResponse(ctx.session);
}

async function sumTransactions(bumdesId: number) {
  const { prisma } = await import("@/lib/prisma");
  const [inc, exp, units] = await Promise.all([
    prisma.bumdesTransaction.aggregate({
      where: { bumdesId, direction: "income" },
      _sum: { amount: true },
    }),
    prisma.bumdesTransaction.aggregate({
      where: { bumdesId, direction: "expense" },
      _sum: { amount: true },
    }),
    prisma.bumdesUnit.count({ where: { bumdesId, status: "active" } }),
  ]);

  const totalIncome = Number(inc._sum.amount ?? 0);
  const totalExpense = Number(exp._sum.amount ?? 0);

  return {
    unitCount: units,
    totalIncome,
    totalExpense,
    netProfit: totalIncome - totalExpense,
  };
}

export { sumTransactions };
