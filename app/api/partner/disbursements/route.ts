import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiSession } from "@/lib/api-session";
import { getPartnerSession } from "@/lib/partner-session";
import { toJSONSafe } from "@/utils/json";

export async function GET(req: NextRequest) {
  const session = await getApiSession(req);
  const partner = getPartnerSession(session);
  if (!partner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const qs = req.nextUrl.searchParams;
  const rawLimit = qs.get("limit");
  const rawOffset = qs.get("offset");
  const limit = Math.min(
    50,
    Math.max(
      1,
      Number.isFinite(Number(rawLimit)) ? Math.floor(Number(rawLimit || 25)) : 25,
    ),
  );
  const offset = Math.max(
    0,
    Number.isFinite(Number(rawOffset)) ? Math.floor(Number(rawOffset || 0)) : 0,
  );

  const [total, disbursements] = await prisma.$transaction([
    prisma.partnerDisbursement.count({ where: { partnerId: partner.partnerId } }),
    prisma.partnerDisbursement.findMany({
      where: { partnerId: partner.partnerId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        items: {
          include: {
            commissionEntry: {
              select: {
                id: true,
                type: true,
                amount: true,
                description: true,
                villageId: true,
                status: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return NextResponse.json(
    {
      total,
      disbursements: toJSONSafe(disbursements),
    },
    { status: 200 },
  );
}
