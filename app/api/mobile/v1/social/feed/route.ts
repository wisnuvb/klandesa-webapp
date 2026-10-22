import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { blockedPairs, requireSocial, serializePost } from "@/lib/mobile/social";
import { FEED_PAGE_SIZE, canEditPost, isFeedFilter, parseCursor } from "@/lib/mobile/social-logic";
import { excerpt } from "@/lib/mobile/mail-logic";

/** Feed urut waktu (tanpa algoritma). `filter`: all|rt|kegiatan|usaha|foto|saved, `q` (kata/#tag), `cursor` (id terakhir). */
export async function GET(req: NextRequest) {
  const g = await requireSocial(req);
  if (!g.ok) return g.response;
  const { s } = g;
  const sp = req.nextUrl.searchParams;
  const filter = isFeedFilter(sp.get("filter")) ? (sp.get("filter") as string) : "all";
  const cursor = parseCursor(sp.get("cursor"));
  const q = (sp.get("q") ?? "").trim().replace(/[%_\\]/g, "").slice(0, 60);

  const blocked = await blockedPairs("citizen", s.account.id);
  const and: Prisma.SocialPostWhereInput[] = [
    { villageId: s.ctx.villageId },
    { OR: [{ status: "PUBLISHED" }, { status: "PENDING", authorType: "citizen", authorId: s.account.id }] },
  ];
  if (blocked.length) and.push({ NOT: { OR: blocked.map((b) => ({ authorType: b.authorType, authorId: b.authorId })) } });
  if (cursor) and.push({ id: { lt: cursor } });
  if (filter === "rt") and.push({ authorRt: s.account.rt ?? "__none__" });
  else if (filter === "kegiatan" || filter === "usaha") and.push({ category: filter });
  else if (filter === "foto") and.push({ media: { some: {} } });
  else if (filter === "saved") {
    const saved = await prisma.socialBookmark.findMany({ where: { accountType: "citizen", accountId: s.account.id }, select: { postId: true }, orderBy: { createdAt: "desc" }, take: 200 });
    and.push({ id: { in: saved.map((b) => b.postId) } });
  }
  if (q) and.push({ content: { contains: q } });

  const rows = await prisma.socialPost.findMany({
    where: { AND: and }, orderBy: { id: "desc" }, take: FEED_PAGE_SIZE + 1,
    include: { media: { select: { url: true, sortOrder: true } } },
  });
  const page = rows.slice(0, FEED_PAGE_SIZE);
  const ids = page.map((p) => p.id);
  const [likes, saves] = ids.length
    ? await Promise.all([
        prisma.socialLike.findMany({ where: { postId: { in: ids }, accountType: "citizen", accountId: s.account.id }, select: { postId: true } }),
        prisma.socialBookmark.findMany({ where: { postId: { in: ids }, accountType: "citizen", accountId: s.account.id }, select: { postId: true } }),
      ])
    : [[], []];
  const viewer = { id: s.account.id, liked: new Set(likes.map((l) => l.postId)), saved: new Set(saves.map((b) => b.postId)) };

  // Halaman pertama tanpa filter: kabar resmi desa yang disematkan di atas feed.
  const official = !cursor && filter === "all" && !q
    ? (await prisma.announcement.findMany({
        where: { villageId: s.ctx.villageId, isActive: true, isPinned: true, publishDate: { lte: new Date() }, OR: [{ expiryDate: null }, { expiryDate: { gt: new Date() } }] },
        orderBy: { publishDate: "desc" }, take: 2, select: { id: true, title: true, content: true, category: true, publishDate: true },
      })).map((a) => ({ id: a.id, title: a.title, excerpt: excerpt(a.content, 160), category: a.category, publishedAt: a.publishDate }))
    : [];

  return NextResponse.json({
    items: page.map((p) => serializePost(p, viewer, canEditPost)),
    official,
    nextCursor: rows.length > FEED_PAGE_SIZE ? String(page[page.length - 1]!.id) : null,
  });
}
