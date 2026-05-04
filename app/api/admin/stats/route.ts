import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformSession } from "@/app/api/admin/_auth";

export async function GET(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const [villages, partners, partnerApplicationsNew] = await Promise.all([
    prisma.village.count(),
    prisma.partner.count({ where: { status: "active" } }),
    prisma.partnerApplication.count({ where: { status: "NEW" } }),
  ]);

  return NextResponse.json(
    { villages, partners, partnerApplicationsNew },
    { status: 200 },
  );
}
