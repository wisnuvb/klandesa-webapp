import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { readJsonBody } from "@/lib/http/read-json";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { INPUT_LIMITS } from "@/lib/letters/server/input";
import { createLetter } from "@/lib/letters/server/service";

/** POST — buat surat v2 (draf atau langsung terbit). Nomor surat dialokasikan server. */
export async function POST(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village, userId } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) return subscriptionBlockedResponse(village);

    const parsed = await readJsonBody(req, INPUT_LIMITS.requestBytes);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    if (!parsed.body || typeof parsed.body !== "object" || Array.isArray(parsed.body)) {
      return NextResponse.json({ error: "Body harus berupa objek" }, { status: 400 });
    }

    const result = await createLetter({ village, userId, body: parsed.body as Record<string, unknown> });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.value, { status: 201 });
  } catch (err) {
    console.error("POST /api/letters error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
