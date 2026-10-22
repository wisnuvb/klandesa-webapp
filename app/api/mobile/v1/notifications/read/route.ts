import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMobileContext } from "@/lib/mobile/context";

/** Tandai dibaca: `{ ids: number[] }` atau `{ all: true }`. */
export async function POST(req: NextRequest) {
  const loaded = await requireMobileContext(req, { skipSubscription: true });
  if (!loaded.ok) return loaded.response;
  const { ctx } = loaded;
  const body = (await req.json().catch(() => null)) as { ids?: unknown; all?: unknown } | null;
  const where = { accountType: ctx.accountType, accountId: ctx.accountId, readAt: null };
  if (body?.all === true) {
    await prisma.userNotification.updateMany({ where, data: { readAt: new Date() } });
  } else if (Array.isArray(body?.ids)) {
    const ids = body.ids.filter((n): n is number => Number.isInteger(n)).slice(0, 100).map((n) => BigInt(n));
    if (ids.length) await prisma.userNotification.updateMany({ where: { ...where, id: { in: ids } }, data: { readAt: new Date() } });
  }
  return new NextResponse(null, { status: 204 });
}
