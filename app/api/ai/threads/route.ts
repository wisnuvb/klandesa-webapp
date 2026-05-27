import { NextRequest, NextResponse } from "next/server";
import { listThreadsForUser } from "@/lib/ai/thread-store";
import { requireVillageApiContext } from "@/lib/api-village-context";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;

    const { village, userId } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const threads = await listThreadsForUser(village.id, userId);
    return NextResponse.json({ threads });
  } catch (e) {
    console.error("GET /api/ai/threads", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
