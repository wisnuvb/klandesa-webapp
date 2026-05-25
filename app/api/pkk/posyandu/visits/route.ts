import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { parsePosyanduVisitInput } from "@/lib/pkk/schemas";
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

    const sessionIdParam = req.nextUrl.searchParams.get("sessionId");
    const stuntingOnly = req.nextUrl.searchParams.get("stunting") === "1";

    const where: {
      session: { villageId: number };
      sessionId?: number;
      isStunting?: boolean;
    } = {
      session: { villageId: village.id },
    };

    if (sessionIdParam) {
      const sessionId = Number(sessionIdParam);
      if (!Number.isFinite(sessionId) || sessionId <= 0) {
        return NextResponse.json({ error: "sessionId tidak valid" }, { status: 400 });
      }
      where.sessionId = Math.trunc(sessionId);
    }

    if (stuntingOnly) {
      where.isStunting = true;
    }

    const visits = await prisma.posyanduVisit.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      include: {
        resident: { select: { id: true, name: true, nik: true, rt: true, rw: true } },
        session: {
          select: {
            id: true,
            sessionDate: true,
            location: true,
          },
        },
      },
    });

    return NextResponse.json({
      rows: visits.map((v) => ({
        id: v.id,
        sessionId: v.sessionId,
        sessionDate: v.session.sessionDate.toISOString().slice(0, 10),
        sessionLocation: v.session.location,
        residentId: v.residentId,
        residentName: v.resident.name,
        residentNik: v.resident.nik,
        residentRt: v.resident.rt,
        residentRw: v.resident.rw,
        weightKg: v.weightKg,
        heightCm: v.heightCm,
        notes: v.notes,
        isStunting: v.isStunting,
        createdAt: v.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("GET /api/pkk/posyandu/visits", e);
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
    const input = parsePosyanduVisitInput(body);
    if (!input) {
      return NextResponse.json(
        { error: "sessionId dan residentId wajib diisi dengan benar" },
        { status: 400 },
      );
    }

    const session = await prisma.posyanduSession.findFirst({
      where: { id: input.sessionId, villageId: village.id },
    });
    if (!session) {
      return NextResponse.json({ error: "Sesi posyandu tidak ditemukan" }, { status: 404 });
    }

    const resident = await prisma.resident.findFirst({
      where: { id: input.residentId, villageId: village.id },
    });
    if (!resident) {
      return NextResponse.json({ error: "Warga tidak ditemukan" }, { status: 404 });
    }

    const created = await prisma.posyanduVisit.create({
      data: {
        sessionId: input.sessionId,
        residentId: input.residentId,
        weightKg: input.weightKg,
        heightCm: input.heightCm,
        notes: input.notes,
        isStunting: input.isStunting ?? false,
      },
      include: {
        resident: { select: { id: true, name: true, nik: true } },
      },
    });

    if (input.isStunting) {
      await prisma.resident.update({
        where: { id: input.residentId },
        data: { isStunting: true },
      });
    }

    return NextResponse.json({
      ok: true,
      row: {
        id: created.id,
        sessionId: created.sessionId,
        residentId: created.residentId,
        residentName: created.resident.name,
        weightKg: created.weightKg,
        heightCm: created.heightCm,
        isStunting: created.isStunting,
      },
    });
  } catch (e) {
    const msg = String(e);
    if (msg.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Warga sudah tercatat di sesi ini" },
        { status: 409 },
      );
    }
    console.error("POST /api/pkk/posyandu/visits", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
