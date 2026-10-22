import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { blockedPairs, requireSocial, serializePost } from "@/lib/mobile/social";
import { canEditPost, checkPostContent, cleanText } from "@/lib/mobile/social-logic";

async function loadVisible(id: bigint, s: { ctx: { villageId: number }; account: { id: number } }) {
  const p = await prisma.socialPost.findFirst({
    where: { id, villageId: s.ctx.villageId, OR: [{ status: "PUBLISHED" }, { status: "PENDING", authorType: "citizen", authorId: s.account.id }] },
    include: { media: { select: { url: true, sortOrder: true } } },
  });
  if (!p) return null;
  const blocked = await blockedPairs("citizen", s.account.id);
  if (blocked.some((b) => b.authorType === p.authorType && b.authorId === p.authorId)) return null;
  return p;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireSocial(req);
  if (!g.ok) return g.response;
  const { s } = g;
  const id = (await params).id;
  if (!/^\d{1,18}$/.test(id)) return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);
  const p = await loadVisible(BigInt(id), s);
  if (!p) return mobileError("INVALID_REQUEST", "Postingan tidak ditemukan atau sudah dihapus.", 404);
  const [like, save] = await Promise.all([
    prisma.socialLike.findUnique({ where: { postId_accountType_accountId: { postId: p.id, accountType: "citizen", accountId: s.account.id } }, select: { postId: true } }),
    prisma.socialBookmark.findUnique({ where: { postId_accountType_accountId: { postId: p.id, accountType: "citizen", accountId: s.account.id } }, select: { postId: true } }),
  ]);
  return NextResponse.json(serializePost(p, { id: s.account.id, liked: new Set(like ? [p.id] : []), saved: new Set(save ? [p.id] : []) }, canEditPost));
}

/** Edit teks dalam 15 menit pertama. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireSocial(req, { write: true });
  if (!g.ok) return g.response;
  const { s } = g;
  const id = (await params).id;
  const body = (await req.json().catch(() => null)) as { content?: unknown } | null;
  if (!/^\d{1,18}$/.test(id)) return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);
  const p = await prisma.socialPost.findFirst({ where: { id: BigInt(id), villageId: s.ctx.villageId, authorType: "citizen", authorId: s.account.id, status: "PUBLISHED" }, include: { media: { select: { id: true } } } });
  if (!p) return mobileError("INVALID_REQUEST", "Postingan tidak ditemukan.", 404);
  if (!canEditPost(p.createdAt)) return mobileError("FORBIDDEN", "Postingan hanya bisa diedit dalam 15 menit pertama.", 403);
  const text = cleanText(body?.content);
  const check = checkPostContent(text, { hasMedia: p.media.length > 0, hasVideo: !!p.youtubeId, customBanned: s.bannedWords });
  if (!check.ok) return mobileError("INVALID_REQUEST", check.message, 400);
  await prisma.socialPost.update({ where: { id: p.id }, data: { content: text, editedAt: new Date(), status: s.mode === "pre" ? "PENDING" : "PUBLISHED" } });
  return new NextResponse(null, { status: 204 });
}

/** Hapus postingan sendiri (hapus permanen). */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireSocial(req);
  if (!g.ok) return g.response;
  const { s } = g;
  const id = (await params).id;
  if (!/^\d{1,18}$/.test(id)) return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);
  const res = await prisma.socialPost.deleteMany({ where: { id: BigInt(id), villageId: s.ctx.villageId, authorType: "citizen", authorId: s.account.id } });
  if (res.count !== 1) return mobileError("INVALID_REQUEST", "Postingan tidak ditemukan.", 404);
  return new NextResponse(null, { status: 204 });
}
