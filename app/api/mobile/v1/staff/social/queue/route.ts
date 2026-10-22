import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/mobile/staff";
import { excerpt } from "@/lib/mobile/mail-logic";
import { youtubeThumb } from "@/lib/mobile/social-logic";

/** Antrean moderasi: postingan menunggu persetujuan (mode pra-moderasi), serta konten yang dilaporkan/disembunyikan. */
export async function GET(req: NextRequest) {
  const g = await requireStaff(req, "forum", "read");
  if (!g.ok) return g.response;
  const v = g.ctx.villageId;

  const [pending, flaggedPosts, flaggedComments, mode] = await Promise.all([
    prisma.socialPost.findMany({ where: { villageId: v, status: "PENDING" }, orderBy: { id: "asc" }, take: 50, include: { media: { select: { url: true }, take: 4 } } }),
    prisma.socialPost.findMany({ where: { villageId: v, OR: [{ status: "HIDDEN" }, { status: "PUBLISHED", reportsCount: { gt: 0 } }] }, orderBy: { reportsCount: "desc" }, take: 50, include: { media: { select: { url: true }, take: 4 } } }),
    prisma.socialComment.findMany({ where: { villageId: v, OR: [{ status: "HIDDEN" }, { status: "PUBLISHED", reportsCount: { gt: 0 } }] }, orderBy: { reportsCount: "desc" }, take: 50 }),
    prisma.village.findUnique({ where: { id: v }, select: { settings: true } }),
  ]);

  const reasons = async (type: "post" | "comment", ids: bigint[]) => {
    if (!ids.length) return new Map<string, string[]>();
    const rows = await prisma.socialReport.findMany({ where: { targetType: type, targetId: { in: ids }, status: "OPEN" }, select: { targetId: true, reason: true } });
    const m = new Map<string, string[]>();
    for (const r of rows) m.set(String(r.targetId), [...(m.get(String(r.targetId)) ?? []), r.reason]);
    return m;
  };
  const [pr, cr] = await Promise.all([reasons("post", flaggedPosts.map((p) => p.id)), reasons("comment", flaggedComments.map((c) => c.id))]);

  const post = (p: (typeof pending)[number], reasonsMap?: Map<string, string[]>) => ({
    kind: "post" as const, id: Number(p.id), status: p.status, author: p.authorName, authorId: p.authorId, authorRt: p.authorRt, category: p.category,
    content: excerpt(p.content, 300), photos: p.media.map((m) => m.url), youtubeThumb: p.youtubeId ? youtubeThumb(p.youtubeId) : null,
    reports: p.reportsCount, reasons: reasonsMap?.get(String(p.id)) ?? [], createdAt: p.createdAt,
  });
  const settings = (mode?.settings ?? {}) as { mobile?: { social?: { mode?: string } } };

  return NextResponse.json({
    mode: settings.mobile?.social?.mode ?? "off",
    pending: pending.map((p) => post(p)),
    flagged: [
      ...flaggedPosts.map((p) => post(p, pr)),
      ...flaggedComments.map((c) => ({
        kind: "comment" as const, id: Number(c.id), status: c.status, author: c.authorName, authorId: c.authorId, authorRt: null, category: "komentar",
        content: excerpt(c.content, 300), photos: [] as string[], youtubeThumb: null, reports: c.reportsCount, reasons: cr.get(String(c.id)) ?? [], createdAt: c.createdAt, postId: Number(c.postId),
      })),
    ],
  });
}
