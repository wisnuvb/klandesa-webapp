import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toJSONSafe } from "@/utils/json";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";
import {
  effectiveCoopAccess,
  fetchCooperativeForVillage,
  fetchMembershipForUser,
  isVillageCoopElevated,
} from "@/lib/coop/access";
import { resolveVillageFromSession } from "@/lib/coop/resolve-village";
import { getApiSession } from "@/lib/api-session";
import { authOptions } from "@/auth";
import { getToken } from "next-auth/jwt";
import { isRegionalAccount } from "@/lib/regional-session";
import {
  loadCoopApiContextWithCooperative,
  requireManage,
} from "@/lib/coop/api-context";

async function sumLedger(cooperativeId: number) {
  const [inc, exp, members] = await Promise.all([
    prisma.cooperativeLedgerEntry.aggregate({
      where: { cooperativeId, direction: "income" },
      _sum: { amount: true },
    }),
    prisma.cooperativeLedgerEntry.aggregate({
      where: { cooperativeId, direction: "expense" },
      _sum: { amount: true },
    }),
    prisma.cooperativeMember.count({ where: { cooperativeId } }),
  ]);

  const totalIncome = Number(inc._sum.amount ?? 0);
  const totalExpense = Number(exp._sum.amount ?? 0);

  return {
    memberCount: members,
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
  };
}

export async function GET(req: NextRequest) {
  const session = await getApiSession(req);
  const token = await getToken({ req, secret: authOptions.secret });
  if (!session?.user?.id && !token?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isRegionalAccount(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const village = await resolveVillageFromSession(session, token);
  if (!village || !isVillageSubscriptionActive(village)) {
    if (village) return subscriptionBlockedResponse(village);
    return NextResponse.json({ error: "Desa tidak ditemukan" }, { status: 404 });
  }

  const userId = parseInt(String(session?.user?.id ?? token?.id ?? ""), 10);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { villageId: true, isActive: true },
  });
  if (!dbUser?.isActive || dbUser.villageId !== village.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const villageRole = session?.user?.role;
  const cooperative = await fetchCooperativeForVillage(village.id);

  if (!cooperative) {
    if (!isVillageCoopElevated(villageRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({
      success: true,
      data: {
        cooperative: null,
        stats: null,
        canManage: true,
        canRead: false,
        needsBootstrap: true,
      },
    });
  }

  const membership = await fetchMembershipForUser(cooperative.id, userId);
  const access = effectiveCoopAccess(villageRole, membership);
  if (!access?.read) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const stats = await sumLedger(cooperative.id);

  return NextResponse.json({
    success: true,
    data: {
      cooperative: toJSONSafe(cooperative),
      stats,
      canManage: access.manage,
      canRead: true,
      needsBootstrap: false,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const loaded = await loadCoopApiContextWithCooperative(req);
  if (!loaded.ok) return loaded.response;
  const { ctx } = loaded;
  const deny = requireManage(ctx);
  if (deny) return deny;

  const body = await req.json().catch(() => ({}));
  const name =
    typeof body.name === "string" && body.name.trim()
      ? body.name.trim().slice(0, 255)
      : undefined;
  const address =
    typeof body.address === "string" ? body.address : undefined;
  const phone =
    typeof body.phone === "string"
      ? body.phone.trim().slice(0, 50) || null
      : undefined;
  const email =
    typeof body.email === "string"
      ? body.email.trim().slice(0, 255) || null
      : undefined;
  const legalNotes =
    typeof body.legalNotes === "string" ? body.legalNotes : undefined;

  if (
    name === undefined &&
    address === undefined &&
    phone === undefined &&
    email === undefined &&
    legalNotes === undefined
  ) {
    return NextResponse.json(
      { error: "Tidak ada field yang diperbarui" },
      { status: 400 },
    );
  }

  const cooperative = await prisma.cooperative.update({
    where: { id: ctx.cooperative.id },
    data: {
      ...(name !== undefined && { name }),
      ...(address !== undefined && { address }),
      ...(phone !== undefined && { phone }),
      ...(email !== undefined && { email }),
      ...(legalNotes !== undefined && { legalNotes }),
    },
  });

  return NextResponse.json({
    success: true,
    data: toJSONSafe(cooperative),
    message: "Profil koperasi diperbarui",
  });
}
