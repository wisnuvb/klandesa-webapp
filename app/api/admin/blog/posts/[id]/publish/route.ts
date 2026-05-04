import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { toJSONSafe } from "@/utils/json";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  let postId: bigint;
  try {
    postId = BigInt(id);
  } catch {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  const updated = await prisma.blogPost.update({
    where: { id: postId },
    data: {
      status: "published",
      publishedAt: new Date(),
    },
    select: { id: true, slug: true, status: true, publishedAt: true },
  });

  return NextResponse.json({ ok: true, post: toJSONSafe(updated) }, { status: 200 });
}

