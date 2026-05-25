import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { parseSdgTagsInput } from "@/lib/pertanian/schemas";
import { parseSdgGoalIds } from "@/lib/sdgs/parse-goals";
import { invalidateFinanceSummaryCache } from "@/lib/finance/summary-cache";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;

    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const { id } = await params;
    const txId = BigInt(id);
    const body = await req.json().catch(() => null);
    const sdgGoalIds = parseSdgTagsInput(body);
    if (!sdgGoalIds) {
      return NextResponse.json({ error: "sdgGoalIds wajib diisi" }, { status: 400 });
    }

    const existing = await prisma.transaction.findFirst({
      where: { id: txId, villageId: village.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
    }

    const updated = await prisma.transaction.update({
      where: { id: txId },
      data: { sdgGoalIds },
    });

    invalidateFinanceSummaryCache(village.id);

    return NextResponse.json({
      ok: true,
      id: String(updated.id),
      sdgGoalIds: parseSdgGoalIds(updated.sdgGoalIds),
    });
  } catch (e) {
    console.error("PATCH /api/finance/transactions/[id]/sdg-tags", e);
    return NextResponse.json({ error: "Gagal menyimpan tag SDGs" }, { status: 500 });
  }
}
