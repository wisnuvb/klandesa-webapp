import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { requireSocial } from "@/lib/mobile/social";

/** Hapus komentar sendiri. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireSocial(req);
  if (!g.ok) return g.response;
  const { s } = g;
  const id = (await params).id;
  if (!/^\d{1,18}$/.test(id)) return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);
  const c = await prisma.socialComment.findFirst({ where: { id: BigInt(id), villageId: s.ctx.villageId, authorType: s.me.type, authorId: s.account.id }, select: { id: true, postId: true, status: true } });
  if (!c) return mobileError("INVALID_REQUEST", "Komentar tidak ditemukan.", 404);
  await prisma.$transaction([
    prisma.socialComment.delete({ where: { id: c.id } }),
    ...(c.status === "PUBLISHED" ? [prisma.socialPost.updateMany({ where: { id: c.postId, commentsCount: { gt: 0 } }, data: { commentsCount: { decrement: 1 } } })] : []),
  ]);
  return new NextResponse(null, { status: 204 });
}
