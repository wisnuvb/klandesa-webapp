import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { readJsonBody } from "@/lib/http/read-json";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { INPUT_LIMITS } from "@/lib/letters/server/input";
import { deleteDraft, getLetterDetail, updateLetter } from "@/lib/letters/server/service";

type Ctx = { params: Promise<{ id: string }> };

async function parseId(ctx: Ctx): Promise<bigint | null> {
  const { id } = await ctx.params;
  return /^\d{1,18}$/.test(id) ? BigInt(id) : null;
}

/** GET — detail surat v2 (dokumen beku + nilai) untuk pratinjau/ubah/cetak ulang. */
export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) return subscriptionBlockedResponse(village);
    const id = await parseId(ctx);
    if (id == null) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });

    const result = await getLetterDetail(village, id);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.value);
  } catch (err) {
    console.error("GET /api/letters/[id] error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

/** PATCH — ubah/terbitkan draf, atau arsipkan surat terbit. */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village, userId } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) return subscriptionBlockedResponse(village);
    const id = await parseId(ctx);
    if (id == null) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });

    const parsed = await readJsonBody(req, INPUT_LIMITS.requestBytes);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    if (!parsed.body || typeof parsed.body !== "object" || Array.isArray(parsed.body)) {
      return NextResponse.json({ error: "Body harus berupa objek" }, { status: 400 });
    }

    const result = await updateLetter({ village, userId, id, body: parsed.body as Record<string, unknown> });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.value);
  } catch (err) {
    console.error("PATCH /api/letters/[id] error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

/** DELETE — buang draf. Surat yang sudah terbit tidak bisa dihapus. */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) return subscriptionBlockedResponse(village);
    const id = await parseId(ctx);
    if (id == null) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });

    const result = await deleteDraft(village, id);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.value);
  } catch (err) {
    console.error("DELETE /api/letters/[id] error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
