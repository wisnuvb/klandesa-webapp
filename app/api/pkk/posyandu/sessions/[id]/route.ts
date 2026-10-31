import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { auditWeb } from "@/lib/audit/web-audit";
import { diffRecord, pickSummary } from "@/lib/audit/diff";
import { parsePosyanduSessionInput } from "@/lib/pkk/schemas";
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
    const sessionId = Number(id);
    if (!Number.isInteger(sessionId)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }
    const body = await req.json().catch(() => null);
    const input = parsePosyanduSessionInput(body);
    if (!input) {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const existing = await prisma.posyanduSession.findFirst({
      where: { id: sessionId, villageId: village.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });
    }

    if (input.dasawismaId) {
      const dasawisma = await prisma.dasawisma.findFirst({
        where: { id: input.dasawismaId, villageId: village.id },
        select: { id: true },
      });
      if (!dasawisma) {
        return NextResponse.json({ error: "Dasawisma tidak ditemukan" }, { status: 404 });
      }
    }

    const updated = await prisma.posyanduSession.update({
      where: { id: sessionId },
      data: {
        sessionDate: new Date(input.sessionDate),
        location: input.location,
        dasawismaId: input.dasawismaId,
      },
    });

    await auditWeb(req, loaded.ctx, "update", "posyandu_sessions", sessionId, diffRecord(existing, updated, { ignoreFields: new Set(["updatedAt"]) }));

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/pkk/posyandu/sessions/[id]", e);
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
    const sessionId = Number(id);
    if (!Number.isInteger(sessionId)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }
    const existing = await prisma.posyanduSession.findFirst({
      where: { id: sessionId, villageId: village.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });
    }

    await prisma.posyanduSession.delete({ where: { id: sessionId } });
    await auditWeb(_req, loaded.ctx, "delete", "posyandu_sessions", sessionId, pickSummary(existing, ["sessionDate", "location", "dasawismaId"]));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/pkk/posyandu/sessions/[id]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
