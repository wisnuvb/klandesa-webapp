import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";
import { parsePositionId, parsePositionUpdate } from "@/lib/positions/schema";

type RouteContext = { params: Promise<{ id: string }> };

function serverError(label: string, err: unknown) {
  console.error(`${label} error:`, err);
  return NextResponse.json(
    { error: "Terjadi kesalahan server" },
    { status: 500 },
  );
}

function inUseResponse(count: number) {
  return NextResponse.json(
    {
      error: `Jabatan masih dipakai oleh ${count} perangkat desa. Pindahkan perangkat tersebut ke jabatan lain, atau ubah status jabatan menjadi Tidak Aktif.`,
    },
    { status: 409 },
  );
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const positionId = parsePositionId((await context.params).id);
    if (positionId === null) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Body permintaan tidak valid" },
        { status: 400 },
      );
    }

    const parsed = parsePositionUpdate(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const existing = await prisma.position.findFirst({
      where: { id: positionId, villageId: village.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Jabatan tidak ditemukan" },
        { status: 404 },
      );
    }

    const updated = await prisma.position.update({
      where: { id: positionId },
      data: parsed.data,
      include: { _count: { select: { officials: true } } },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      level: updated.level,
      description: updated.description,
      salary: updated.salary,
      allowance: updated.allowance,
      isActive: updated.isActive,
      total_staff: updated._count.officials,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    return serverError("PATCH /api/positions/[id]", err);
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const positionId = parsePositionId((await context.params).id);
    if (positionId === null) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const existing = await prisma.position.findFirst({
      where: { id: positionId, villageId: village.id },
      select: { id: true, _count: { select: { officials: true } } },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Jabatan tidak ditemukan" },
        { status: 404 },
      );
    }

    // Official.positionId tanpa onDelete: tanpa pengecekan ini DB melempar FK error (500 generik).
    if (existing._count.officials > 0) {
      return inUseResponse(existing._count.officials);
    }

    try {
      await prisma.position.delete({ where: { id: positionId } });
    } catch (err) {
      // Perangkat baru ditambahkan di antara pengecekan dan penghapusan.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2003"
      ) {
        return inUseResponse(1);
      }
      // Sudah dihapus permintaan lain: hasil akhirnya sama dengan yang diminta.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2025"
      ) {
        return NextResponse.json({ success: true });
      }
      throw err;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError("DELETE /api/positions/[id]", err);
  }
}
