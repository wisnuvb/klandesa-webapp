import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toJSONSafe } from "@/utils/json";
import { loadBumdesApiContext, requireBumdesManage } from "@/lib/bumdes/api-context";
import {
  parseEntryDate,
  parseOptionalString,
  parsePositiveAmount,
  parseRequiredString,
  parseTransactionDirection,
} from "@/lib/bumdes/schemas";

export async function GET(req: NextRequest) {
  const loaded = await loadBumdesApiContext(req, { requireExisting: true });
  if (!loaded.ok) return loaded.response;
  if ("needsBootstrap" in loaded && loaded.needsBootstrap) {
    return NextResponse.json({ error: "BUMDes belum dibuat" }, { status: 404 });
  }

  const unitIdParam = req.nextUrl.searchParams.get("unitId");
  const unitId = unitIdParam ? parseInt(unitIdParam, 10) : undefined;

  const entries = await prisma.bumdesTransaction.findMany({
    where: {
      bumdesId: loaded.ctx.bumdes!.id,
      ...(Number.isFinite(unitId) ? { unitId } : {}),
    },
    orderBy: [{ entryDate: "desc" }, { id: "desc" }],
    include: {
      unit: { select: { id: true, name: true, category: true } },
      createdUser: { select: { id: true, name: true } },
    },
    take: 500,
  });

  return NextResponse.json({
    success: true,
    data: toJSONSafe(entries),
  });
}

export async function POST(req: NextRequest) {
  const loaded = await loadBumdesApiContext(req, { requireExisting: true });
  if (!loaded.ok) return loaded.response;
  if ("needsBootstrap" in loaded && loaded.needsBootstrap) {
    return NextResponse.json({ error: "BUMDes belum dibuat" }, { status: 404 });
  }

  const deny = requireBumdesManage(loaded.ctx);
  if (deny) return deny;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const unitId = Number(body.unitId);
  if (!Number.isFinite(unitId)) {
    return NextResponse.json({ error: "unitId wajib diisi" }, { status: 400 });
  }

  const unit = await prisma.bumdesUnit.findFirst({
    where: { id: unitId, bumdesId: loaded.ctx.bumdes!.id },
  });
  if (!unit) {
    return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 404 });
  }

  const direction = parseTransactionDirection(body.direction);
  if (!direction) {
    return NextResponse.json(
      { error: "direction harus income atau expense" },
      { status: 400 },
    );
  }

  const amount = parsePositiveAmount(body.amount);
  if (amount === null) {
    return NextResponse.json({ error: "Jumlah tidak valid" }, { status: 400 });
  }

  const category = parseRequiredString(body.category, 100);
  if (!category) {
    return NextResponse.json({ error: "Kategori wajib diisi" }, { status: 400 });
  }

  const entryDate = parseEntryDate(body.entryDate);
  if (entryDate === null) {
    return NextResponse.json({ error: "Tanggal tidak valid (gunakan ISO)" }, { status: 400 });
  }

  const description = parseOptionalString(body.description, 5000);

  const row = await prisma.bumdesTransaction.create({
    data: {
      bumdesId: loaded.ctx.bumdes!.id,
      unitId: unit.id,
      entryDate,
      direction,
      amount,
      category,
      description: description ?? undefined,
      createdBy: loaded.ctx.userId,
    },
    include: {
      unit: { select: { id: true, name: true, category: true } },
      createdUser: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    success: true,
    data: toJSONSafe(row),
    message: "Transaksi dicatat",
  });
}
