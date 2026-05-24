import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiSession } from "@/lib/api-session";
import { getPartnerSession } from "@/lib/partner-session";
import { PARTNER_COMMISSION_TYPES, PARTNER_COMMISSION_STATUSES } from "@/lib/partner/commission";
import { toJSONSafe } from "@/utils/json";

export async function GET(req: NextRequest) {
  const session = await getApiSession(req);
  const partner = getPartnerSession(session);
  if (!partner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const qs = req.nextUrl.searchParams;
  const rawLimit = qs.get("limit");
  const rawOffset = qs.get("offset");
  const limit = Math.min(
    100,
    Math.max(
      1,
      Number.isFinite(Number(rawLimit)) ? Math.floor(Number(rawLimit || 50)) : 50,
    ),
  );
  const offset = Math.max(
    0,
    Number.isFinite(Number(rawOffset)) ? Math.floor(Number(rawOffset || 0)) : 0,
  );

  const typeParam = qs.get("type")?.trim() ?? "";
  const statusParam = qs.get("status")?.trim() ?? "";
  const villageIdRaw = qs.get("villageId");

  const typeOk = typeParam && PARTNER_COMMISSION_TYPES.includes(typeParam as typeof PARTNER_COMMISSION_TYPES[number]);
  const statusOk =
    statusParam && PARTNER_COMMISSION_STATUSES.includes(statusParam as typeof PARTNER_COMMISSION_STATUSES[number]);

  let villageId: number | undefined;
  if (villageIdRaw != null && villageIdRaw !== "") {
    const n = Number(villageIdRaw);
    if (!Number.isFinite(n)) {
      return NextResponse.json({ error: "villageId tidak valid" }, { status: 400 });
    }
    villageId = Math.floor(n);
  }

  const where = {
    partnerId: partner.partnerId,
    ...(typeOk ? { type: typeParam } : {}),
    ...(statusOk ? { status: statusParam } : {}),
    ...(villageId != null ? { villageId } : {}),
  };

  const [total, rows] = await prisma.$transaction([
    prisma.partnerCommissionEntry.count({ where }),
    prisma.partnerCommissionEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        villageId: true,
        type: true,
        sourceInvoiceId: true,
        amount: true,
        currency: true,
        description: true,
        status: true,
        periodStart: true,
        periodEnd: true,
        createdAt: true,
        village: {
          select: {
            id: true,
            code: true,
            name: true,
            regency: true,
            district: true,
          },
        },
      },
    }),
  ]);

  return NextResponse.json({ total, commissions: toJSONSafe(rows) }, { status: 200 });
}
