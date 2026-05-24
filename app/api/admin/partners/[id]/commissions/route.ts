import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { PARTNER_COMMISSION_TYPES, PARTNER_COMMISSION_STATUSES } from "@/lib/partner/commission";
import { toJSONSafe } from "@/utils/json";

function partnerIdFromParam(raw: string): number | null {
  const n = Number(raw);
  return Number.isFinite(n) ? Math.floor(n) : null;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const pid = partnerIdFromParam((await ctx.params).id ?? "");
  if (pid == null) {
    return NextResponse.json({ error: "ID mitra tidak valid" }, { status: 400 });
  }

  const partner = await prisma.partner.findUnique({ where: { id: pid }, select: { id: true } });
  if (!partner) return NextResponse.json({ error: "Mitra tidak ditemukan" }, { status: 404 });

  const qs = req.nextUrl.searchParams;
  const rawLimit = qs.get("limit");
  const rawOffset = qs.get("offset");
  const limit = Math.min(
    200,
    Math.max(
      1,
      Number.isFinite(Number(rawLimit)) ? Math.floor(Number(rawLimit || 100)) : 100,
    ),
  );
  const offset = Math.max(
    0,
    Number.isFinite(Number(rawOffset)) ? Math.floor(Number(rawOffset || 0)) : 0,
  );

  const typeParam = qs.get("type")?.trim() ?? "";
  const statusParam = qs.get("status")?.trim() ?? "";

  const typeOk = typeParam && PARTNER_COMMISSION_TYPES.includes(typeParam as typeof PARTNER_COMMISSION_TYPES[number]);
  const statusOk =
    statusParam && PARTNER_COMMISSION_STATUSES.includes(statusParam as typeof PARTNER_COMMISSION_STATUSES[number]);

  const where = {
    partnerId: pid,
    ...(typeOk ? { type: typeParam } : {}),
    ...(statusOk ? { status: statusParam } : {}),
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
