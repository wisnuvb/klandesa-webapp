import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { audit, requireStaff } from "@/lib/mobile/staff";

/** restore: HIDDEN→PUBLISHED · remove: →REMOVED (hitungan komentar di postingan dikurangi). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireStaff(req, "forum", "update");
  if (!g.ok) return g.response;
  const { ctx } = g;
  const id = (await params).id;
  const body = (await req.json().catch(() => null)) as { decision?: unknown } | null;
  if (!/^\d{1,18}$/.test(id) || (body?.decision !== "restore" && body?.decision !== "remove")) return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);

  const c = await prisma.socialComment.findFirst({ where: { id: BigInt(id), villageId: ctx.villageId }, select: { id: true, status: true, postId: true } });
  if (!c) return mobileError("INVALID_REQUEST", "Komentar tidak ditemukan.", 404);

  if (body.decision === "remove") {
    if (c.status === "REMOVED") return mobileError("INVALID_REQUEST", "Komentar sudah dihapus.", 409);
    await prisma.$transaction([
      prisma.socialComment.update({ where: { id: c.id }, data: { status: "REMOVED" } }),
      ...(c.status === "PUBLISHED" ? [prisma.socialPost.updateMany({ where: { id: c.postId, commentsCount: { gt: 0 } }, data: { commentsCount: { decrement: 1 } } })] : []),
      prisma.socialReport.updateMany({ where: { targetType: "comment", targetId: c.id, status: "OPEN" }, data: { status: "ACTIONED" } }),
    ]);
  } else {
    if (c.status !== "HIDDEN") return mobileError("INVALID_REQUEST", "Komentar tidak sedang disembunyikan.", 409);
    await prisma.$transaction([
      prisma.socialComment.update({ where: { id: c.id }, data: { status: "PUBLISHED", reportsCount: 0 } }),
      prisma.socialReport.updateMany({ where: { targetType: "comment", targetId: c.id, status: "OPEN" }, data: { status: "DISMISSED" } }),
    ]);
  }
  void audit(ctx, req, `social_comment_${body.decision}`, "social_comments", id);
  return new NextResponse(null, { status: 204 });
}
