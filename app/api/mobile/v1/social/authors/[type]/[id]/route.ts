import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { asAccountType, blockedPairs, isMe, requireSocial, serializePost } from "@/lib/mobile/social";
import { FEED_PAGE_SIZE, canEditPost, parseCursor } from "@/lib/mobile/social-logic";

/** Profil ringan seorang penulis: nama/RT (snapshot dari postingan) + daftar postingan terpublikasinya. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ type: string; id: string }> }) {
  const g = await requireSocial(req);
  if (!g.ok) return g.response;
  const { s } = g;
  const { type, id } = await params;
  if ((type !== "citizen" && type !== "staff") || !/^\d{1,9}$/.test(id)) return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);
  const authorId = Number(id);
  const authorType = asAccountType(type);
  const cursor = parseCursor(req.nextUrl.searchParams.get("cursor"));

  const blocked = await blockedPairs(s.me.type, s.account.id);
  if (blocked.some((b) => b.authorType === authorType && b.authorId === authorId)) {
    return mobileError("INVALID_REQUEST", "Profil tidak ditemukan.", 404);
  }

  const where = { villageId: s.ctx.villageId, authorType, authorId, status: "PUBLISHED" as const };
  const [rows, postsCount] = await Promise.all([
    prisma.socialPost.findMany({
      where: { ...where, ...(cursor ? { id: { lt: cursor } } : {}) },
      orderBy: { id: "desc" }, take: FEED_PAGE_SIZE + 1,
      include: { media: { select: { url: true, sortOrder: true } } },
    }),
    prisma.socialPost.count({ where }),
  ]);
  const page = rows.slice(0, FEED_PAGE_SIZE);
  const ids = page.map((p) => p.id);
  const [likes, saves] = ids.length
    ? await Promise.all([
        prisma.socialLike.findMany({ where: { postId: { in: ids }, accountType: s.me.type, accountId: s.account.id }, select: { postId: true } }),
        prisma.socialBookmark.findMany({ where: { postId: { in: ids }, accountType: s.me.type, accountId: s.account.id }, select: { postId: true } }),
      ])
    : [[], []];
  const viewer = { type: s.me.type, id: s.account.id, liked: new Set(likes.map((l) => l.postId)), saved: new Set(saves.map((b) => b.postId)) };

  return NextResponse.json({
    author: { type: authorType, id: authorId, name: page[0]?.authorName ?? null, rt: page[0]?.authorRt ?? null, mine: isMe(s, authorType, authorId), postsCount },
    items: page.map((p) => serializePost(p, viewer, canEditPost)),
    nextCursor: rows.length > FEED_PAGE_SIZE ? String(page[page.length - 1]!.id) : null,
  });
}
