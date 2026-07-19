import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { isRegionalNewsEnabled } from "@/lib/regional-news/config";
import { getRegionalNewsForRegion } from "@/lib/regional-news/service";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";

export async function GET(req: NextRequest) {
  const loaded = await requireVillageApiContext(req);
  if (!loaded.ok) return loaded.response;
  const { village } = loaded.ctx;

  if (!isVillageSubscriptionActive(village)) {
    return subscriptionBlockedResponse(village);
  }

  if (!isRegionalNewsEnabled()) {
    return NextResponse.json(
      { error: "Berita regional belum diaktifkan" },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const limitRaw = Number(url.searchParams.get("limit") ?? 5);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(12, Math.max(1, Math.floor(limitRaw)))
    : 5;

  const feed = await getRegionalNewsForRegion(
    village.province,
    village.regency,
    limit,
  );

  return NextResponse.json(feed);
}
