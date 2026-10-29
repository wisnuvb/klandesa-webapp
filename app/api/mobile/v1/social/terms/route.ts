import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSocial } from "@/lib/mobile/social";

export async function POST(req: NextRequest) {
  const g = await requireSocial(req, { allowWithoutTerms: true });
  if (!g.ok) return g.response;
  if (g.s.me.type === "citizen") await prisma.citizenAccount.update({ where: { id: g.s.account.id }, data: { socialTermsAt: new Date() } });
  return new NextResponse(null, { status: 204 });
}
