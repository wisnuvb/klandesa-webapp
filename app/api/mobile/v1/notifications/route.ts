import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMobileContext } from "@/lib/mobile/context";

export async function GET(req: NextRequest) {
  const loaded = await requireMobileContext(req, { skipSubscription: true });
  if (!loaded.ok) return loaded.response;
  const { ctx } = loaded;
  const rows = await prisma.userNotification.findMany({
    where: { accountType: ctx.accountType, accountId: ctx.accountId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({
    items: rows.map((n) => ({ id: Number(n.id), type: n.type, title: n.title, body: n.body, deepLink: n.deepLink, read: !!n.readAt, createdAt: n.createdAt })),
  });
}
