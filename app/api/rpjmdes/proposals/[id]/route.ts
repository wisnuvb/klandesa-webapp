import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
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
    const proposalId = Number(id);
    const body = await req.json().catch(() => null);
    const status =
      body && typeof body === "object" && typeof (body as { status?: unknown }).status === "string"
        ? (body as { status: string }).status
        : null;

    if (!status || !["submitted", "reviewed", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
    }

    const existing = await prisma.musdesProposal.findFirst({
      where: { id: proposalId, villageId: village.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Usulan tidak ditemukan" }, { status: 404 });
    }
    if (existing.status === "approved") {
      return NextResponse.json({ error: "Usulan sudah disetujui" }, { status: 409 });
    }

    await prisma.musdesProposal.update({
      where: { id: proposalId },
      data: { status },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/rpjmdes/proposals/[id]", e);
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
    const proposalId = Number(id);
    const existing = await prisma.musdesProposal.findFirst({
      where: { id: proposalId, villageId: village.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Usulan tidak ditemukan" }, { status: 404 });
    }
    if (existing.status === "approved") {
      return NextResponse.json(
        { error: "Usulan yang sudah disetujui tidak bisa dihapus" },
        { status: 409 },
      );
    }

    await prisma.musdesProposal.delete({ where: { id: proposalId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/rpjmdes/proposals/[id]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
