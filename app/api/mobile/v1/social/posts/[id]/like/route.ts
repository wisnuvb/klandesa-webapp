import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { requireSocial } from "@/lib/mobile/social";
import { notifyAccount } from "@/lib/mobile/notify";

const MILESTONES = new Set([1, 5, 10, 25, 50, 100]);

/** Atur suka: `{ liked: boolean }` (idempoten). Hitungan dijaga konsisten dengan baris like. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireSocial(req, { write: true });
  if (!g.ok) return g.response;
  const { s } = g;
  const id = (await params).id;
  const body = (await req.json().catch(() => null)) as { liked?: unknown } | null;
  if (!/^\d{1,18}$/.test(id) || typeof body?.liked !== "boolean") return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);

  const post = await prisma.socialPost.findFirst({ where: { id: BigInt(id), villageId: s.ctx.villageId, status: "PUBLISHED" }, select: { id: true, authorType: true, authorId: true, content: true } });
  if (!post) return mobileError("INVALID_REQUEST", "Postingan tidak ditemukan.", 404);

  const key = { postId_accountType_accountId: { postId: post.id, accountType: "citizen", accountId: s.account.id } };
  const existing = await prisma.socialLike.findUnique({ where: key, select: { id: true } });
  let likes: number;
  if (body.liked && !existing) {
    await prisma.socialLike.create({ data: { postId: post.id, accountType: "citizen", accountId: s.account.id } });
    likes = (await prisma.socialPost.update({ where: { id: post.id }, data: { likesCount: { increment: 1 } }, select: { likesCount: true } })).likesCount;
    if (post.authorType === "citizen" && post.authorId !== s.account.id && MILESTONES.has(likes)) {
      void notifyAccount("citizen", post.authorId, s.ctx.villageId, { type: "system", title: likes === 1 ? "Ada yang menyukai postingan Anda" : `${likes} warga menyukai postingan Anda`, body: post.content.slice(0, 80), deepLink: `/warga/${Number(post.id)}` });
    }
  } else if (!body.liked && existing) {
    await prisma.socialLike.delete({ where: { id: existing.id } });
    likes = (await prisma.socialPost.update({ where: { id: post.id }, data: { likesCount: { decrement: 1 } }, select: { likesCount: true } })).likesCount;
  } else {
    likes = (await prisma.socialPost.findUnique({ where: { id: post.id }, select: { likesCount: true } }))?.likesCount ?? 0;
  }
  return NextResponse.json({ liked: body.liked, likes: Math.max(0, likes) });
}
