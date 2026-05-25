import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { aggregateSdgSpending } from "@/lib/finance/sdg-spending";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;

    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const yearParam = req.nextUrl.searchParams.get("year");
    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
    if (!Number.isFinite(year)) {
      return NextResponse.json({ error: "Tahun tidak valid" }, { status: 400 });
    }

    const data = await aggregateSdgSpending(village.id, year);

    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error("GET /api/finance/sdg-spending", e);
    return NextResponse.json({ error: "Gagal memuat belanja SDGs" }, { status: 500 });
  }
}
