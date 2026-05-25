import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const loaded = await requireVillageApiContext(_req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const { id } = await params;
    const visitId = Number(id);
    const existing = await prisma.posyanduVisit.findFirst({
      where: { id: visitId, session: { villageId: village.id } },
      include: { resident: { select: { id: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Kunjungan tidak ditemukan" }, { status: 404 });
    }

    await prisma.posyanduVisit.delete({ where: { id: visitId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/pkk/posyandu/visits/[id]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
