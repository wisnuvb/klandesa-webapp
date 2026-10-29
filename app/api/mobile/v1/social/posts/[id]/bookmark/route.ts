import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { requireSocial } from "@/lib/mobile/social";
import { learnFromPost } from "@/lib/mobile/social-interest";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireSocial(req);
  if (!g.ok) return g.response;
  const { s } = g;
  const id = (await params).id;
  const body = (await req.json().catch(() => null)) as { saved?: unknown } | null;
  if (!/^\d{1,18}$/.test(id) || typeof body?.saved !== "boolean") return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);
  const post = await prisma.socialPost.findFirst({ where: { id: BigInt(id), villageId: s.ctx.villageId, status: "PUBLISHED" }, select: { id: true } });
  if (!post) return mobileError("INVALID_REQUEST", "Postingan tidak ditemukan.", 404);
  const had = !!(await prisma.socialBookmark.findUnique({ where: { postId_accountType_accountId: { postId: post.id, accountType: s.me.type, accountId: s.account.id } }, select: { id: true } }));
  if (body.saved !== had) void learnFromPost(s.me, post.id, body.saved ? "save" : "unsave");
  if (body.saved) {
    await prisma.socialBookmark.upsert({
      where: { postId_accountType_accountId: { postId: post.id, accountType: s.me.type, accountId: s.account.id } },
      create: { postId: post.id, accountType: s.me.type, accountId: s.account.id }, update: {},
    });
  } else {
    await prisma.socialBookmark.deleteMany({ where: { postId: post.id, accountType: s.me.type, accountId: s.account.id } });
  }
  return new NextResponse(null, { status: 204 });
}
