import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { blockedPairs, requireSocial } from "@/lib/mobile/social";
import { notifyAccount } from "@/lib/mobile/notify";
import { COMMENTS_PER_HOUR, checkCommentContent, cleanText } from "@/lib/mobile/social-logic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireSocial(req);
  if (!g.ok) return g.response;
  const { s } = g;
  const id = (await params).id;
  if (!/^\d{1,18}$/.test(id)) return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);
  const post = await prisma.socialPost.findFirst({ where: { id: BigInt(id), villageId: s.ctx.villageId, status: "PUBLISHED" }, select: { id: true } });
  if (!post) return mobileError("INVALID_REQUEST", "Postingan tidak ditemukan.", 404);

  const blocked = await blockedPairs("citizen", s.account.id);
  const rows = await prisma.socialComment.findMany({
    where: {
      postId: post.id, status: "PUBLISHED",
      ...(blocked.length ? { NOT: { OR: blocked.map((b) => ({ authorType: b.authorType, authorId: b.authorId })) } } : {}),
    },
    orderBy: { id: "asc" }, take: 200,
  });
  return NextResponse.json({
    items: rows.map((c) => ({ id: Number(c.id), author: { type: c.authorType, id: c.authorId, name: c.authorName, mine: c.authorType === "citizen" && c.authorId === s.account.id }, content: c.content, createdAt: c.createdAt })),
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireSocial(req, { write: true });
  if (!g.ok) return g.response;
  const { s } = g;
  const id = (await params).id;
  const body = (await req.json().catch(() => null)) as { content?: unknown } | null;
  if (!/^\d{1,18}$/.test(id)) return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);
  const text = cleanText(body?.content);
  const check = checkCommentContent(text, s.bannedWords);
  if (!check.ok) return mobileError("INVALID_REQUEST", check.message, 400, { field: "content" });

  const post = await prisma.socialPost.findFirst({ where: { id: BigInt(id), villageId: s.ctx.villageId, status: "PUBLISHED" }, select: { id: true, authorType: true, authorId: true, content: true } });
  if (!post) return mobileError("INVALID_REQUEST", "Postingan tidak ditemukan.", 404);
  const blocked = await blockedPairs("citizen", s.account.id);
  if (blocked.some((b) => b.authorType === post.authorType && b.authorId === post.authorId)) {
    return mobileError("FORBIDDEN", "Anda tidak bisa berkomentar di postingan ini.", 403);
  }

  const recent = await prisma.socialComment.count({ where: { authorType: "citizen", authorId: s.account.id, createdAt: { gte: new Date(Date.now() - 3600_000) } } });
  if (recent >= COMMENTS_PER_HOUR) return mobileError("RATE_LIMITED", "Terlalu banyak komentar dalam satu jam. Istirahat sebentar.", 429);

  const [c] = await prisma.$transaction([
    prisma.socialComment.create({ data: { postId: post.id, villageId: s.ctx.villageId, authorType: "citizen", authorId: s.account.id, authorName: s.account.name, content: text } }),
    prisma.socialPost.update({ where: { id: post.id }, data: { commentsCount: { increment: 1 } } }),
  ]);

  // Beri tahu penulis; maksimal satu notifikasi per postingan per jam agar tidak membanjiri.
  if (post.authorType === "citizen" && post.authorId !== s.account.id) {
    const link = `/warga/${Number(post.id)}`;
    const dup = await prisma.userNotification.count({ where: { accountType: "citizen", accountId: post.authorId, deepLink: link, type: "system", createdAt: { gte: new Date(Date.now() - 3600_000) } } });
    if (!dup) void notifyAccount("citizen", post.authorId, s.ctx.villageId, { type: "system", title: `${s.account.name} berkomentar di postingan Anda`, body: text.slice(0, 100), deepLink: link });
  }
  return NextResponse.json({ id: Number(c.id) }, { status: 201 });
}
