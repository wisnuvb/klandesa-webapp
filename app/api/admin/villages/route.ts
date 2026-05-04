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
            { code: { contains: query } },
            { district: { contains: query } },
            { regency: { contains: query } },
            { province: { contains: query } },
          ],
        };

  const villages = await prisma.village.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      code: true,
      name: true,
      district: true,
      regency: true,
      province: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ villages }, { status: 200 });
}
