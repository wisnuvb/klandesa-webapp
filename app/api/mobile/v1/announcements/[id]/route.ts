import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError, requireMobileContext } from "@/lib/mobile/context";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const loaded = await requireMobileContext(req);
  if (!loaded.ok) return loaded.response;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);
  const now = new Date();
  const a = await prisma.announcement.findFirst({
    where: { id, villageId: loaded.ctx.villageId, isActive: true, publishDate: { lte: now }, OR: [{ expiryDate: null }, { expiryDate: { gt: now } }] },
    select: { id: true, title: true, content: true, category: true, imageUrl: true, publishDate: true },
  });
  if (!a) return mobileError("INVALID_REQUEST", "Kabar tidak ditemukan.", 404);
  void prisma.announcement.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => undefined);
  return NextResponse.json({ ...a, publishedAt: a.publishDate });
}
