import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { parseDasawismaInput } from "@/lib/pkk/schemas";
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

    const rows = await prisma.dasawisma.findMany({
      where: { villageId: village.id },
      orderBy: [{ rw: "asc" }, { rt: "asc" }],
      include: {
        _count: { select: { posyanduSessions: true } },
      },
    });

    return NextResponse.json({
      rows: rows.map((d) => ({
        id: d.id,
        rt: d.rt,
        rw: d.rw,
        leaderName: d.leaderName,
        memberCount: d.memberCount,
        sessionCount: d._count.posyanduSessions,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("GET /api/pkk/dasawisma", e);
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
    const input = parseDasawismaInput(body);
    if (!input) {
      return NextResponse.json(
        { error: "RT, RW, dan nama ketua wajib diisi" },
        { status: 400 },
      );
    }

    const created = await prisma.dasawisma.create({
      data: {
        villageId: village.id,
        rt: input.rt,
        rw: input.rw,
        leaderName: input.leaderName,
        memberCount: input.memberCount ?? 0,
      },
    });

    return NextResponse.json({
      ok: true,
      row: {
        id: created.id,
        rt: created.rt,
        rw: created.rw,
        leaderName: created.leaderName,
        memberCount: created.memberCount,
      },
    });
  } catch (e) {
    const msg = String(e);
    if (msg.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Dasawisma RT/RW sudah terdaftar" },
        { status: 409 },
      );
    }
    console.error("POST /api/pkk/dasawisma", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
