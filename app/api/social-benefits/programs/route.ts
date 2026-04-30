import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";
import { NextRequest, NextResponse } from "next/server";

/** Daftar program bantuan per desa (admin). */
export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const programs = await prisma.socialBenefitProgram.findMany({
      where: { villageId: village.id },
      orderBy: [{ sortOrder: "asc" }, { id: "desc" }],
      include: {
        _count: { select: { beneficiaries: true } },
      },
    });

    const rows = programs.map((p) => ({
      id: p.id,
      name: p.name,
      periodLabel: p.periodLabel,
      internalNote: p.internalNote,
      isActive: p.isActive,
      sortOrder: p.sortOrder,
      beneficiaryCount: p._count.beneficiaries,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    return NextResponse.json({ rows });
  } catch (e) {
    console.error("GET /api/social-benefits/programs", e);
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

    const body = (await req.json().catch(() => null)) as {
      name?: unknown;
      periodLabel?: unknown;
      internalNote?: unknown;
      isActive?: unknown;
      sortOrder?: unknown;
    } | null;

    const name = String(body?.name ?? "").trim();
    if (!name || name.length > 255) {
      return NextResponse.json(
        { error: "Nama program wajib (maks. 255 karakter)" },
        { status: 400 },
      );
    }

    const periodLabel = body?.periodLabel
      ? String(body.periodLabel).trim().slice(0, 120)
      : null;
    const internalNote = body?.internalNote
      ? String(body.internalNote).trim().slice(0, 2000)
      : null;
    const isActive =
      body?.isActive === undefined ? true : Boolean(body?.isActive);
    const sortOrder =
      body?.sortOrder === undefined ? 0 : Number(body?.sortOrder);
    const so = Number.isFinite(sortOrder) ? Math.trunc(sortOrder) : 0;

    const created = await prisma.socialBenefitProgram.create({
      data: {
        villageId: village.id,
        name,
        periodLabel: periodLabel || null,
        internalNote,
        isActive,
        sortOrder: so,
      },
    });

    return NextResponse.json({
      ok: true,
      program: {
        id: created.id,
        name: created.name,
        periodLabel: created.periodLabel,
        internalNote: created.internalNote,
        isActive: created.isActive,
        sortOrder: created.sortOrder,
      },
    });
  } catch (e) {
    console.error("POST /api/social-benefits/programs", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
