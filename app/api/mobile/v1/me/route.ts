import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMobileContext } from "@/lib/mobile/context";

export async function GET(req: NextRequest) {
  const loaded = await requireMobileContext(req);
  if (!loaded.ok) return loaded.response;
  const { ctx } = loaded;

  let name = "";
  if (ctx.accountType === "staff") {
    const u = await prisma.user.findUnique({ where: { id: ctx.accountId }, select: { name: true } });
    name = u?.name ?? "";
  }
  return NextResponse.json({
    account: { type: ctx.accountType, id: ctx.accountId, name, role: ctx.role },
    village: { id: ctx.village.id, code: ctx.village.code, name: ctx.village.name, logoUrl: ctx.village.logoUrl },
  });
}
