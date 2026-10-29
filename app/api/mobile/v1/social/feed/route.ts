import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { blockedPairs, forYouFor, requireSocial, serializePost } from "@/lib/mobile/social";
import { FEED_PAGE_SIZE, canEditPost, isFeedFilter, parseCursor } from "@/lib/mobile/social-logic";
import { RANKING, encodeRankCursor, featuresOf, parseRankCursor, rankForYou, type Candidate } from "@/lib/mobile/social-ranking";
import { loadProfile } from "@/lib/mobile/social-interest";
import { excerpt } from "@/lib/mobile/mail-logic";

/**
 * Feed Warga. `sort=latest` (bawaan): urut waktu murni. `sort=foryou`: diperingkat menurut minat warga dengan pagar
 * anti-gelembung (lib/mobile/social-ranking.ts); bila tidak tersedia untuk akun/desa ini, otomatis jatuh ke urut waktu
 * dan `ranked: false` pada respons. Pencarian (`q`) dan "Disimpan" selalu urut waktu karena warga mencari sesuatu yang spesifik.
 * `filter`: all|rt|kegiatan|usaha|foto|saved, `q` (kata/#tag), `cursor`: id terakhir (urut waktu) atau `r<waktu>.<posisi>` (diperingkat).
 */
export async function GET(req: NextRequest) {
  const g = await requireSocial(req);
  if (!g.ok) return g.response;
  const { s } = g;
  const sp = req.nextUrl.searchParams;
  const filter = isFeedFilter(sp.get("filter")) ? (sp.get("filter") as string) : "all";
  const rawCursor = sp.get("cursor");
  const rankCursor = parseRankCursor(rawCursor);
  const cursor = rankCursor ? null : parseCursor(rawCursor);
  const q = (sp.get("q") ?? "").trim().replace(/[%_\\]/g, "").slice(0, 60);

  const blocked = await blockedPairs(s.me.type, s.account.id);
  const and: Prisma.SocialPostWhereInput[] = [
    { villageId: s.ctx.villageId },
    { OR: [{ status: "PUBLISHED" }, { status: "PENDING", authorType: s.me.type, authorId: s.account.id }] },
  ];
  if (blocked.length) and.push({ NOT: { OR: blocked.map((b) => ({ authorType: b.authorType, authorId: b.authorId })) } });
  if (filter === "rt") and.push({ authorRt: s.account.rt ?? "__none__" });
  else if (filter === "kegiatan" || filter === "usaha") and.push({ category: filter });
  else if (filter === "foto") and.push({ media: { some: {} } });
  else if (filter === "saved") {
    const saved = await prisma.socialBookmark.findMany({ where: { accountType: s.me.type, accountId: s.account.id }, select: { postId: true }, orderBy: { createdAt: "desc" }, take: 200 });
    and.push({ id: { in: saved.map((b) => b.postId) } });
  }
  if (q) and.push({ content: { contains: q } });

  // Halaman pertama tanpa filter: kabar resmi desa yang disematkan di atas feed. Tidak pernah dipersonalisasi.
  const official = !rawCursor && filter === "all" && !q
    ? (await prisma.announcement.findMany({
        where: { villageId: s.ctx.villageId, isActive: true, isPinned: true, publishDate: { lte: new Date() }, OR: [{ expiryDate: null }, { expiryDate: { gt: new Date() } }] },
        orderBy: { publishDate: "desc" }, take: 2, select: { id: true, title: true, content: true, category: true, publishDate: true },
      })).map((a) => ({ id: a.id, title: a.title, excerpt: excerpt(a.content, 160), category: a.category, publishedAt: a.publishDate }))
    : [];

  const wantRank = sp.get("sort") === "foryou" && !q && filter !== "saved" && !cursor && (await forYouFor(s));
  const media = { select: { url: true, sortOrder: true } } as const;

  if (wantRank) {
    const asOf = rankCursor?.asOf ?? Date.now();
    const offset = rankCursor?.offset ?? 0;
    const rows = await prisma.socialPost.findMany({
      where: { AND: [...and, { createdAt: { lte: new Date(asOf) } }] }, orderBy: { id: "desc" }, take: RANKING.candidateMax, include: { media },
    });
    const ids = rows.map((r) => r.id);
    const me = { accountType: s.me.type, accountId: s.account.id };
    const [signals, commentRows, likes, saves, learned] = await Promise.all([
      // Hanya jejak sebelum waktu acuan, supaya urutan tidak berubah di tengah sesi gulir.
      prisma.socialPostSignal.findMany({ where: { ...me, postId: { in: ids }, lastSeenAt: { lte: new Date(asOf) } }, select: { postId: true, seenForYou: true, seenLatest: true, openForYou: true, openLatest: true, hidden: true } }),
      prisma.socialComment.groupBy({ by: ["postId", "authorType", "authorId"], where: { postId: { in: ids }, status: "PUBLISHED" } }),
      prisma.socialLike.findMany({ where: { postId: { in: ids }, ...me }, select: { postId: true } }),
      prisma.socialBookmark.findMany({ where: { postId: { in: ids }, ...me }, select: { postId: true } }),
      loadProfile(s.me),
    ]);

    const sig = new Map(signals.map((x) => [x.postId, x]));
    const commenters = new Map<bigint, number>();
    for (const c of commentRows) commenters.set(c.postId, (commenters.get(c.postId) ?? 0) + 1);
    const cands: Candidate[] = rows.map((r) => {
      const sg = sig.get(r.id);
      return {
        ...featuresOf({ id: r.id, authorType: r.authorType, authorId: r.authorId, authorRt: r.authorRt, category: r.category, content: r.content, photos: r.media.length, hasLink: !!(r.linkUrl || r.youtubeId) }),
        authorName: r.authorName, createdAt: r.createdAt, likes: r.likesCount, commenters: commenters.get(r.id) ?? 0, reports: r.reportsCount,
        seen: (sg?.seenForYou ?? 0) + (sg?.seenLatest ?? 0), opens: (sg?.openForYou ?? 0) + (sg?.openLatest ?? 0), hidden: sg?.hidden ?? false,
        mine: r.authorType === s.me.type && r.authorId === s.account.id, authorIsStaff: r.authorType === "staff",
      };
    });
    const ranked = rankForYou(cands, learned.profile, { now: asOf, viewerRt: s.account.rt });

    const byId = new Map(rows.map((r) => [Number(r.id), r]));
    const viewer = { type: s.me.type, id: s.account.id, liked: new Set(likes.map((l) => l.postId)), saved: new Set(saves.map((b) => b.postId)) };
    const page = ranked.slice(offset, offset + FEED_PAGE_SIZE);
    const nextOffset = offset + FEED_PAGE_SIZE;
    const oldest = rows.length ? rows[rows.length - 1]!.id : null;
    return NextResponse.json({
      ranked: true,
      items: page.flatMap((x) => { const r = byId.get(x.id); return r ? [{ ...serializePost(r, viewer, canEditPost), why: x.why }] : []; }),
      official,
      // Bahan peringkat habis: lanjut urut waktu dari postingan tertua yang sudah dinilai (cursor angka biasa).
      nextCursor: nextOffset < ranked.length ? encodeRankCursor(asOf, nextOffset) : rows.length === RANKING.candidateMax && oldest ? String(oldest) : null,
    });
  }

  if (cursor) and.push({ id: { lt: cursor } });
  const rows = await prisma.socialPost.findMany({
    where: { AND: and }, orderBy: { id: "desc" }, take: FEED_PAGE_SIZE + 1, include: { media },
  });
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
    ranked: false,
    items: page.map((p) => ({ ...serializePost(p, viewer, canEditPost), why: null })),
    official,
    nextCursor: rows.length > FEED_PAGE_SIZE ? String(page[page.length - 1]!.id) : null,
  });
}
