import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformSession } from "@/app/api/admin/_auth";

function readLimit(req: NextRequest): number {
  const raw = req.nextUrl.searchParams.get("limit");
  const n = raw ? Number(raw) : 50;
  if (!Number.isFinite(n)) return 50;
  return Math.max(1, Math.min(100, Math.floor(n)));
}

export async function GET(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const query = (req.nextUrl.searchParams.get("query") || "").trim();
  const limit = readLimit(req);

  const where =
    query.length === 0
      ? {}
      : {
          OR: [
            { name: { contains: query } },
            { email: { contains: query } },
            { phone: { contains: query } },
            { region: { contains: query } },
          ],
        };

  const partners = await prisma.partner.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      region: true,
      status: true,
      createdAt: true,
    },
  });

  const partnerIds = partners.map((p) => p.id);

  const [prospectGroups, acquiredGroups] =
    partnerIds.length === 0
      ? [[], []]
      : await Promise.all([
          prisma.partnerProspect.groupBy({
            by: ["partnerId", "status"],
            where: { partnerId: { in: partnerIds } },
            _count: { _all: true },
          }),
          prisma.village.groupBy({
            by: ["acquiredByPartnerId"],
            where: { acquiredByPartnerId: { in: partnerIds } },
            _count: { _all: true },
          }),
        ]);

  const prospectSummaryByPartner = new Map<
    number,
    { total: number; byStatus: Record<string, number> }
  >();
  for (const g of prospectGroups) {
    const partnerId = g.partnerId;
    const status = g.status;
    const count = g._count?._all ?? 0;
    const existing = prospectSummaryByPartner.get(partnerId) ?? {
      total: 0,
      byStatus: {},
    };
    existing.total += count;
    existing.byStatus[status] = (existing.byStatus[status] ?? 0) + count;
    prospectSummaryByPartner.set(partnerId, existing);
  }

  const acquiredVillageCountByPartner = new Map<number, number>();
  for (const g of acquiredGroups) {
    const partnerId = g.acquiredByPartnerId;
    if (typeof partnerId !== "number") continue;
    acquiredVillageCountByPartner.set(partnerId, g._count?._all ?? 0);
  }

  const enriched = partners.map((p) => ({
    ...p,
    stats: {
      prospects: prospectSummaryByPartner.get(p.id) ?? {
        total: 0,
        byStatus: {},
      },
      acquiredVillages: acquiredVillageCountByPartner.get(p.id) ?? 0,
    },
  }));

  return NextResponse.json({ partners: enriched }, { status: 200 });
}
