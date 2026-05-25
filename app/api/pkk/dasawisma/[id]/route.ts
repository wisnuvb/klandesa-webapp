import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { parseDasawismaInput } from "@/lib/pkk/schemas";
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
    const dasId = Number(id);
    const body = await req.json().catch(() => null);
    const input = parseDasawismaInput(body);
    if (!input) {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const existing = await prisma.dasawisma.findFirst({
      where: { id: dasId, villageId: village.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Dasawisma tidak ditemukan" }, { status: 404 });
    }

    await prisma.dasawisma.update({
      where: { id: dasId },
      data: {
        rt: input.rt,
        rw: input.rw,
        leaderName: input.leaderName,
        memberCount: input.memberCount ?? 0,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = String(e);
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: "RT/RW sudah terdaftar" }, { status: 409 });
    }
    console.error("PATCH /api/pkk/dasawisma/[id]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const loaded = await requireVillageApiContext(_req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const { id } = await params;
    const dasId = Number(id);
    const existing = await prisma.dasawisma.findFirst({
      where: { id: dasId, villageId: village.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Dasawisma tidak ditemukan" }, { status: 404 });
    }

    await prisma.dasawisma.delete({ where: { id: dasId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/pkk/dasawisma/[id]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
