import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { buildLetterContext } from "@/lib/letters/server/context";

/** GET — data desa & pejabat untuk kop dan tanda tangan (pratinjau surat di klien). */
export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) return subscriptionBlockedResponse(village);

    const { desa, pejabat, logoUrl } = await buildLetterContext(village);
    return NextResponse.json({ desa, pejabat, logoUrl: logoUrl ?? null });
  } catch (err) {
    console.error("GET /api/letters/context error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
