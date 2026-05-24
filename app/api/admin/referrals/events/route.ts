import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { normalizeReferralCode } from "@/lib/referrals/tracking";

export async function GET(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const code = normalizeReferralCode(req.nextUrl.searchParams.get("code"));
  const action = (req.nextUrl.searchParams.get("action") || "").trim();
  const takeRaw = Number(req.nextUrl.searchParams.get("limit") || 100);
  const take = Number.isFinite(takeRaw)
    ? Math.max(1, Math.min(200, Math.floor(takeRaw)))
    : 100;

  const rows = await prisma.referralEvent.findMany({
    where: {
      ...(code ? { codeSnapshot: code } : {}),
      ...(action ? { action } : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      codeSnapshot: true,
      action: true,
      sourcePath: true,
      name: true,
      email: true,
      phone: true,
      villageName: true,
      subject: true,
      metadata: true,
      ipAddress: true,
      createdAt: true,
      referralCode: {
        select: { code: true, label: true, ownerName: true, commission: true },
      },
    },
  });

  return NextResponse.json({
    events: rows.map((e) => ({
      ...e,
      id: String(e.id),
      createdAt: e.createdAt.toISOString(),
    })),
  });
}
