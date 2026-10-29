import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { asAccountType, isMe, requireSocial } from "@/lib/mobile/social";
import { notifyAccount } from "@/lib/mobile/notify";

/** Atur suka komentar: `{ liked: boolean }` (idempoten). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireSocial(req, { write: true });
  if (!g.ok) return g.response;
  const { s } = g;
  const id = (await params).id;
  const body = (await req.json().catch(() => null)) as { liked?: unknown } | null;
  if (!/^\d{1,18}$/.test(id) || typeof body?.liked !== "boolean") return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);

  const comment = await prisma.socialComment.findFirst({ where: { id: BigInt(id), villageId: s.ctx.villageId, status: "PUBLISHED" }, select: { id: true, postId: true, authorType: true, authorId: true, content: true } });
  if (!comment) return mobileError("INVALID_REQUEST", "Komentar tidak ditemukan.", 404);

  const key = { commentId_accountType_accountId: { commentId: comment.id, accountType: s.me.type, accountId: s.account.id } };
  const existing = await prisma.socialCommentLike.findUnique({ where: key, select: { id: true } });
  let likes: number;
  if (body.liked && !existing) {
    await prisma.socialCommentLike.create({ data: { commentId: comment.id, accountType: s.me.type, accountId: s.account.id } });
    likes = (await prisma.socialComment.update({ where: { id: comment.id }, data: { likesCount: { increment: 1 } }, select: { likesCount: true } })).likesCount;
    if (likes === 1 && !isMe(s, comment.authorType, comment.authorId)) {
      void notifyAccount(asAccountType(comment.authorType), comment.authorId, s.ctx.villageId, { type: "system", title: "Ada yang menyukai komentar Anda", body: comment.content.slice(0, 80), deepLink: `/warga/${Number(comment.postId)}` });
    }
  } else if (!body.liked && existing) {
    await prisma.socialCommentLike.delete({ where: { id: existing.id } });
    likes = (await prisma.socialComment.update({ where: { id: comment.id }, data: { likesCount: { decrement: 1 } }, select: { likesCount: true } })).likesCount;
  } else {
    likes = (await prisma.socialComment.findUnique({ where: { id: comment.id }, select: { likesCount: true } }))?.likesCount ?? 0;
  }
  return NextResponse.json({ liked: body.liked, likes: Math.max(0, likes) });
}
