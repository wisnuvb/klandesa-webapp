import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/mobile/staff";
import { summarizeFeed } from "@/lib/mobile/social-metrics";

/** Ringkasan pengukuran Warga untuk perangkat desa: `?days=14` (1-60). Lihat docs/SOCIAL_FEED_RANKING.md. */
export async function GET(req: NextRequest) {
  const g = await requireStaff(req, "forum", "read");
  if (!g.ok) return g.response;
  const villageId = g.ctx.villageId;
  const days = Math.max(1, Math.min(60, Math.round(Number(req.nextUrl.searchParams.get("days"))) || 14));
  const since = new Date(Date.now() - days * 86_400_000);

  const [signals, posts, likes, comments, reports] = await Promise.all([
    prisma.socialPostSignal.findMany({
      where: { villageId, lastSeenAt: { gte: since } }, take: 30_000,
      select: { accountType: true, accountId: true, postId: true, seenForYou: true, seenLatest: true, openForYou: true, openLatest: true, shares: true, hidden: true },
    }),
    prisma.socialPost.findMany({
      where: { villageId, status: { in: ["PUBLISHED", "HIDDEN"] }, createdAt: { gte: since } }, take: 5_000,
      select: { id: true, authorType: true, authorId: true, likesCount: true, commentsCount: true, reportsCount: true, createdAt: true },
    }),
    prisma.socialLike.groupBy({ by: ["accountType", "accountId"], where: { post: { villageId }, createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.socialComment.groupBy({ by: ["authorType", "authorId"], where: { villageId, createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.socialReport.count({ where: { villageId, targetType: "post", createdAt: { gte: since } } }),
  ]);

  const reactions = new Map<string, number>();
  for (const l of likes) reactions.set(`${l.accountType}:${l.accountId}`, (reactions.get(`${l.accountType}:${l.accountId}`) ?? 0) + l._count._all);
  for (const c of comments) reactions.set(`${c.authorType}:${c.authorId}`, (reactions.get(`${c.authorType}:${c.authorId}`) ?? 0) + c._count._all);

  return NextResponse.json(summarizeFeed({
    days,
    signals: signals.map((r) => ({ ...r, postId: Number(r.postId) })),
    posts: posts.map((p) => ({ id: Number(p.id), authorType: p.authorType, authorId: p.authorId, likes: p.likesCount, comments: p.commentsCount, reports: p.reportsCount, createdAt: p.createdAt })),
    reactions, reports,
  }));
}
