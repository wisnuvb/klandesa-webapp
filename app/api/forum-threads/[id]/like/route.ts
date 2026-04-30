import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    const { id: idStr } = await params;
    const id = BigInt(idStr);

    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const thread = await prisma.forumThread.findFirst({
      where: { id, villageId: village.id },
      select: { id: true },
    });

    if (!thread) {
      return NextResponse.json({ error: "Thread tidak ditemukan" }, { status: 404 });
    }

    const updated = await prisma.forumThread.update({
      where: { id: thread.id },
      data: { likesCount: { increment: 1 } },
      select: { id: true, likesCount: true },
    });

    return NextResponse.json({
      id: Number(updated.id),
      likes_count: updated.likesCount,
    });
  } catch (error) {
    console.error("POST /api/forum-threads/[id]/like error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
