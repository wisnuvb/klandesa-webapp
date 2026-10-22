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
  let username: string | undefined;
  if (ctx.accountType === "citizen") {
    const a = await prisma.citizenAccount.findUnique({
      where: { id: ctx.accountId },
      select: { username: true, resident: { select: { name: true } } },
    });
    name = a?.resident.name ?? "";
    username = a?.username;
  }
  return NextResponse.json({
    account: { type: ctx.accountType, id: ctx.accountId, name, username, role: ctx.role },
    village: { id: ctx.village.id, code: ctx.village.code, name: ctx.village.name, logoUrl: ctx.village.logoUrl },
  });
}
