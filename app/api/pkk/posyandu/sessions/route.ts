import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { parsePosyanduSessionInput } from "@/lib/pkk/schemas";
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

    const sessions = await prisma.posyanduSession.findMany({
      where: { villageId: village.id },
      orderBy: [{ sessionDate: "desc" }, { id: "desc" }],
      include: {
        dasawisma: { select: { id: true, rt: true, rw: true, leaderName: true } },
        _count: { select: { visits: true } },
      },
    });

    return NextResponse.json({
      rows: sessions.map((s) => ({
        id: s.id,
        sessionDate: s.sessionDate.toISOString().slice(0, 10),
        location: s.location,
        dasawismaId: s.dasawismaId,
        dasawisma: s.dasawisma
          ? {
              id: s.dasawisma.id,
              rt: s.dasawisma.rt,
              rw: s.dasawisma.rw,
              leaderName: s.dasawisma.leaderName,
              label: `RT ${s.dasawisma.rt} / RW ${s.dasawisma.rw}`,
            }
          : null,
        visitCount: s._count.visits,
        createdAt: s.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("GET /api/pkk/posyandu/sessions", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;

    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const body = await req.json().catch(() => null);
    const input = parsePosyanduSessionInput(body);
    if (!input) {
      return NextResponse.json(
        { error: "Tanggal sesi dan lokasi wajib diisi" },
        { status: 400 },
      );
    }

    if (input.dasawismaId) {
      const dasawisma = await prisma.dasawisma.findFirst({
        where: { id: input.dasawismaId, villageId: village.id },
      });
      if (!dasawisma) {
        return NextResponse.json(
          { error: "Dasawisma tidak ditemukan" },
          { status: 404 },
        );
      }
    }

    const sessionDate = new Date(input.sessionDate);
    const created = await prisma.posyanduSession.create({
      data: {
        villageId: village.id,
        sessionDate,
        location: input.location,
        dasawismaId: input.dasawismaId,
      },
      include: {
        dasawisma: { select: { id: true, rt: true, rw: true, leaderName: true } },
      },
    });

    return NextResponse.json({
      ok: true,
      row: {
        id: created.id,
        sessionDate: created.sessionDate.toISOString().slice(0, 10),
        location: created.location,
        dasawismaId: created.dasawismaId,
        dasawisma: created.dasawisma,
      },
    });
  } catch (e) {
    console.error("POST /api/pkk/posyandu/sessions", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
