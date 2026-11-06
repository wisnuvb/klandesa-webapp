import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { toJSONSafe } from "@/utils/json";
import { auditPlatform } from "@/lib/platform/audit";
import { actorOf, clip } from "@/lib/platform/legacy-audit";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  if (!/^\d{1,18}$/.test(id)) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }
  const postId = BigInt(id);

  const before = await prisma.blogPost.findUnique({
    where: { id: postId },
    select: { title: true, slug: true, status: true, publishedAt: true },
  });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.blogPost.update({
    where: { id: postId },
    data: {
      status: "published",
      // Menerbitkan ulang artikel yang sudah terbit tidak menggeser tanggal terbitnya.
      publishedAt: before.status === "published" && before.publishedAt ? before.publishedAt : new Date(),
    },
    select: { id: true, slug: true, status: true, publishedAt: true },
  });

  await auditPlatform(req, actorOf(auth), {
    action: "blog.publish",
    targetType: "system",
    targetId: `blog_post:${postId}`,
    summary: `Menerbitkan artikel blog "${clip(before.title, 120)}" (slug ${before.slug})`,
    metadata: { postId: postId.toString(), before: { status: before.status }, after: { status: "published" } },
  });

  return NextResponse.json({ ok: true, post: toJSONSafe(updated) }, { status: 200 });
}
