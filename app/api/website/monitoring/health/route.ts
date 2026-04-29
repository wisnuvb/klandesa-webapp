import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/api-session";
import { prisma } from "@/lib/prisma";
import { resolveVillage } from "@/lib/village";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";

function requireVillageAdmin(session: unknown) {
  const role = (session as { user?: { role?: string } } | null)?.user?.role;
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getApiSession(req);
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const forbidden = requireVillageAdmin(session);
    if (forbidden) return forbidden;

    const village = await resolveVillage({ req, session });
    if (!village) return NextResponse.json({ error: "Desa tidak ditemukan" }, { status: 404 });
    if (!isVillageSubscriptionActive(village)) return subscriptionBlockedResponse(village);

    const [total, active, pending, errorCount, lastError] = await Promise.all([
      prisma.websiteDomain.count({ where: { villageId: village.id } }),
      prisma.websiteDomain.count({ where: { villageId: village.id, status: "active" } }),
      prisma.websiteDomain.count({
        where: { villageId: village.id, status: "pending_verification" },
      }),
      prisma.websiteDomain.count({ where: { villageId: village.id, status: "error" } }),
      prisma.websiteDomain.findFirst({
        where: { villageId: village.id, status: "error" },
        orderBy: { updatedAt: "desc" },
        select: { hostname: true, lastError: true, updatedAt: true },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      domains: {
        total,
        active,
        pending_verification: pending,
        error: errorCount,
        last_error: lastError
          ? {
              hostname: lastError.hostname,
              message: lastError.lastError,
              at: lastError.updatedAt.toISOString(),
            }
          : null,
      },
    });
  } catch (e) {
    console.error("GET /api/website/monitoring/health error:", e);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

