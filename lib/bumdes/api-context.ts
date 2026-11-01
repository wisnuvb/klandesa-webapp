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
  requireBumdesManageForRole,
  requireBumdesReadForRole,
} from "@/lib/bumdes/access";

export type BumdesApiContext = {
  /** Peran dari database (bukan JWT) */
  role: string;
  session: Session;
  userId: number;
  village: Village;
  bumdes: Bumdes;
  canManage: boolean;
};

export type BumdesBootstrapContext = {
  role: string;
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

  const { session, userId, village, dbUser } = loaded.ctx as VillageApiContext;
  const villageRole = dbUser.role;

  const readErr = requireBumdesReadForRole(villageRole);
  if (readErr) return { ok: false, response: readErr };

  if (!isVillageSubscriptionActive(village)) {
    return { ok: false, response: subscriptionBlockedResponse(village) };
  }

  const bumdes = await fetchBumdesForVillage(village.id);
  const canManage = canManageBumdes(villageRole);

  if (!bumdes) {
    if (options?.requireExisting && !isVillageBumdesElevated(villageRole)) {
      return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
    return {
      ok: true,
      ctx: { role: villageRole, session, userId, village, bumdes: null, canManage },
      needsBootstrap: true,
    };
  }

  return {
    ok: true,
    ctx: { role: villageRole, session, userId, village, bumdes, canManage },
  };
}

export function requireBumdesManage(ctx: { role: string }): NextResponse | null {
  return requireBumdesManageForRole(ctx.role);
}

export type BumdesScope =
  | { ok: true; ctx: VillageApiContext; bumdes: Bumdes; canManage: boolean }
  | { ok: false; response: NextResponse };

/**
 * Lingkup BUMDes dari konteks desa yang SUDAH lolos requireVillageApiContext (dipanggil eksplisit di tiap rute):
 * izin baca modul, langganan aktif, BUMDes milik desa sesi (bukan dari body/query), dan izin kelola bila `write`.
 */
export async function bumdesScope(ctx: VillageApiContext, opts: { write?: boolean } = {}): Promise<BumdesScope> {
  const role = ctx.dbUser.role;
  const readErr = requireBumdesReadForRole(role);
  if (readErr) return { ok: false, response: readErr };
  if (!isVillageSubscriptionActive(ctx.village)) return { ok: false, response: subscriptionBlockedResponse(ctx.village) };
  const canManage = canManageBumdes(role);
  if (opts.write) {
    const denied = requireBumdesManageForRole(role);
    if (denied) return { ok: false, response: denied };
  }
  const bumdes = await fetchBumdesForVillage(ctx.village.id);
  if (!bumdes) return { ok: false, response: NextResponse.json({ error: "BUMDes belum dibuat" }, { status: 404 }) };
  return { ok: true, ctx, bumdes, canManage };
}

async function sumTransactions(bumdesId: number) {
  const { prisma } = await import("@/lib/prisma");
  const [inc, exp, units] = await Promise.all([
    prisma.bumdesTransaction.aggregate({
      where: { bumdesId, direction: "income", status: "AKTIF" },
      _sum: { amount: true },
    }),
    prisma.bumdesTransaction.aggregate({
      where: { bumdesId, direction: "expense", status: "AKTIF" },
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
