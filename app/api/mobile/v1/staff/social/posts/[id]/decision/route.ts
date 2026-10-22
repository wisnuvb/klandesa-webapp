import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { audit, requireStaff } from "@/lib/mobile/staff";
import { notifyAccount } from "@/lib/mobile/notify";

/** approve: PENDING→PUBLISHED · restore: HIDDEN→PUBLISHED (laporan dianggap tak berdasar) · remove: →REMOVED (laporan ditindak). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireStaff(req, "forum", "update");
  if (!g.ok) return g.response;
  const { ctx } = g;
  const id = (await params).id;
  const body = (await req.json().catch(() => null)) as { decision?: unknown; note?: unknown } | null;
  const decision = body?.decision;
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 300) : "";
  if (!/^\d{1,18}$/.test(id) || (decision !== "approve" && decision !== "restore" && decision !== "remove")) {
    return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);
  }
  if (decision === "remove" && note.length < 3) return mobileError("INVALID_REQUEST", "Tulis alasan singkat agar penulis tahu.", 400, { field: "note" });

  const post = await prisma.socialPost.findFirst({ where: { id: BigInt(id), villageId: ctx.villageId }, select: { id: true, status: true, authorType: true, authorId: true } });
  if (!post) return mobileError("INVALID_REQUEST", "Postingan tidak ditemukan.", 404);

  const from = decision === "approve" ? ["PENDING"] : decision === "restore" ? ["HIDDEN", "PUBLISHED"] : ["PENDING", "HIDDEN", "PUBLISHED"];
  if (!from.includes(post.status)) return mobileError("INVALID_REQUEST", "Status postingan sudah berubah. Muat ulang.", 409);

  const to = decision === "remove" ? "REMOVED" : "PUBLISHED";
  const res = await prisma.socialPost.updateMany({
    where: { id: post.id, status: post.status },
    data: { status: to, moderationNote: decision === "remove" ? note : null, ...(decision === "restore" ? { reportsCount: 0 } : {}) },
  });
  if (res.count !== 1) return mobileError("INVALID_REQUEST", "Postingan baru saja diubah moderator lain. Muat ulang.", 409);
  await prisma.socialReport.updateMany({ where: { targetType: "post", targetId: post.id, status: "OPEN" }, data: { status: decision === "remove" ? "ACTIONED" : "DISMISSED" } });

  void audit(ctx, req, `social_${decision}`, "social_posts", id, { note: note || undefined });
  if (post.authorType === "citizen") {
    if (decision === "approve") void notifyAccount("citizen", post.authorId, ctx.villageId, { type: "system", title: "Postingan Anda sudah tampil", deepLink: `/warga/${id}` });
    if (decision === "remove") void notifyAccount("citizen", post.authorId, ctx.villageId, { type: "system", title: "Postingan Anda dihapus perangkat desa", body: note });
  }
  return new NextResponse(null, { status: 204 });
}
