import { NextRequest, NextResponse } from "next/server";
import {
  deleteThreadForUser,
  getThreadForUser,
  modeLabel,
} from "@/lib/ai/thread-store";
import { requireVillageApiContext } from "@/lib/api-village-context";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";

function parseThreadId(raw: string): number | null {
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) return null;
  return Math.trunc(id);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;

    const { village, userId } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const { id: idParam } = await params;
    const threadId = parseThreadId(idParam);
    if (!threadId) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const thread = await getThreadForUser(village.id, userId, threadId);
    if (!thread) {
      return NextResponse.json({ error: "Percakapan tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({
      thread: {
        id: thread.id,
        mode: thread.mode,
        modeLabel: modeLabel(thread.mode),
        title: thread.title,
        createdAt: thread.createdAt.toISOString(),
        updatedAt: thread.updatedAt.toISOString(),
        messages: thread.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt.toISOString(),
        })),
      },
    });
  } catch (e) {
    console.error("GET /api/ai/threads/[id]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;

    const { village, userId } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const { id: idParam } = await params;
    const threadId = parseThreadId(idParam);
    if (!threadId) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const ok = await deleteThreadForUser(village.id, userId, threadId);
    if (!ok) {
      return NextResponse.json({ error: "Percakapan tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/ai/threads/[id]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
