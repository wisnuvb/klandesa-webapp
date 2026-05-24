import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiSession } from "@/lib/api-session";
import { getPartnerSession } from "@/lib/partner-session";
import { isVillageSubscriptionActive } from "@/lib/subscription";
import { toJSONSafe } from "@/utils/json";

export async function GET(req: NextRequest) {
  const session = await getApiSession(req);
  const partner = getPartnerSession(session);
  if (!partner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rawLimit = req.nextUrl.searchParams.get("limit");
  const rawOffset = req.nextUrl.searchParams.get("offset");
  const limit = Math.min(
    100,
    Math.max(
      1,
      Number.isFinite(Number(rawLimit)) ? Math.floor(Number(rawLimit || 80)) : 80,
    ),
  );
  const offset = Math.max(
    0,
    Number.isFinite(Number(rawOffset)) ? Math.floor(Number(rawOffset || 0)) : 0,
  );

  const [total, villages] = await prisma.$transaction([
    prisma.village.count({ where: { acquiredByPartnerId: partner.partnerId } }),
    prisma.village.findMany({
      where: { acquiredByPartnerId: partner.partnerId },
      orderBy: [{ acquiredAt: "desc" }, { name: "asc" }],
      take: limit,
      skip: offset,
      select: {
        id: true,
        code: true,
        name: true,
        district: true,
        regency: true,
        province: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionExpiry: true,
        acquiredAt: true,
        acquisitionSource: true,
        isActive: true,
      },
    }),
  ]);

  const withFlags = villages.map((v) => ({
    ...v,
    subscriptionActive: isVillageSubscriptionActive(v),
  }));

  return NextResponse.json({ total, villages: toJSONSafe(withFlags) }, { status: 200 });
}
