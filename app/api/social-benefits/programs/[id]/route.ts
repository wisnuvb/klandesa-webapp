import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";
import { NextRequest, NextResponse } from "next/server";

async function loadProgramForVillage(villageId: number, programId: number) {
  return prisma.socialBenefitProgram.findFirst({
    where: { id: programId, villageId },
    include: { _count: { select: { beneficiaries: true } } },
  });
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

    const id = Number((await ctx.params).id);
    if (!Number.isFinite(id))
      return NextResponse.json({ error: "Program tidak ada" }, { status: 400 });

    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const p = await loadProgramForVillage(village.id, id);
    if (!p) return NextResponse.json({ error: "Program tidak ada" }, { status: 404 });

    return NextResponse.json({
      program: {
        id: p.id,
        name: p.name,
        periodLabel: p.periodLabel,
        internalNote: p.internalNote,
        isActive: p.isActive,
        sortOrder: p.sortOrder,
        beneficiaryCount: p._count.beneficiaries,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    console.error("GET social-benefits/programs/[id]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

    const id = Number((await ctx.params).id);
    if (!Number.isFinite(id))
      return NextResponse.json({ error: "Program tidak ada" }, { status: 400 });

    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const existing = await loadProgramForVillage(village.id, id);
    if (!existing)
      return NextResponse.json({ error: "Program tidak ada" }, { status: 404 });

    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;

    const data: {
      name?: string;
      periodLabel?: string | null;
      internalNote?: string | null;
      isActive?: boolean;
      sortOrder?: number;
    } = {};

    if (body && "name" in body && body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name || name.length > 255) {
        return NextResponse.json(
          { error: "Nama program tidak valid" },
          { status: 400 },
        );
      }
      data.name = name;
    }
    if (body && body.periodLabel !== undefined) {
      data.periodLabel = body.periodLabel
        ? String(body.periodLabel).trim().slice(0, 120)
        : null;
    }
    if (body && body.internalNote !== undefined) {
      data.internalNote = body.internalNote
        ? String(body.internalNote).trim().slice(0, 2000)
        : null;
    }
    if (body && body.isActive !== undefined)
      data.isActive = Boolean(body.isActive);
    if (body && body.sortOrder !== undefined) {
      const so = Number(body.sortOrder);
      data.sortOrder = Number.isFinite(so) ? Math.trunc(so) : 0;
    }

    const updated = await prisma.socialBenefitProgram.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      ok: true,
      program: {
        id: updated.id,
        name: updated.name,
        periodLabel: updated.periodLabel,
        internalNote: updated.internalNote,
        isActive: updated.isActive,
        sortOrder: updated.sortOrder,
      },
    });
  } catch (e) {
    console.error("PATCH social-benefits/programs/[id]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

    const id = Number((await ctx.params).id);
    if (!Number.isFinite(id))
      return NextResponse.json({ error: "Program tidak ada" }, { status: 400 });

    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const existing = await prisma.socialBenefitProgram.findFirst({
      where: { id, villageId: village.id },
    });
    if (!existing)
      return NextResponse.json({ error: "Program tidak ada" }, { status: 404 });

    await prisma.socialBenefitProgram.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE social-benefits/programs/[id]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
