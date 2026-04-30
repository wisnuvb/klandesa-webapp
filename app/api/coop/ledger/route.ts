import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toJSONSafe } from "@/utils/json";
import {
  loadCoopApiContextWithCooperative,
  requireManage,
} from "@/lib/coop/api-context";

export async function GET(req: NextRequest) {
  const loaded = await loadCoopApiContextWithCooperative(req);
  if (!loaded.ok) return loaded.response;

  const { cooperative } = loaded.ctx;

  const entries = await prisma.cooperativeLedgerEntry.findMany({
    where: { cooperativeId: cooperative.id },
    orderBy: [{ entryDate: "desc" }, { id: "desc" }],
    include: {
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
  const loaded = await loadCoopApiContextWithCooperative(req);
  if (!loaded.ok) return loaded.response;
  const deny = requireManage(loaded.ctx);
  if (deny) return deny;

  const { cooperative, userId } = loaded.ctx;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const direction =
    body.direction === "expense"
      ? "expense"
      : body.direction === "income"
        ? "income"
        : null;
  if (!direction) {
    return NextResponse.json(
      { error: "direction harus income atau expense" },
      { status: 400 },
    );
  }

  const amt = Number(body.amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    return NextResponse.json({ error: "Jumlah tidak valid" }, { status: 400 });
  }

  const category =
    typeof body.category === "string" ? body.category.trim().slice(0, 100) : "";
  if (!category) {
    return NextResponse.json({ error: "Kategori wajib diisi" }, { status: 400 });
  }

  const entryDateRaw = body.entryDate;
  let entryDate = new Date();
  if (typeof entryDateRaw === "string" && entryDateRaw) {
    entryDate = new Date(entryDateRaw);
    if (Number.isNaN(entryDate.getTime())) {
      return NextResponse.json(
        { error: "Tanggal tidak valid (gunakan ISO)" },
        { status: 400 },
      );
    }
  }

  const description =
    typeof body.description === "string" ? body.description.trim() || null : null;

  const row = await prisma.cooperativeLedgerEntry.create({
    data: {
      cooperativeId: cooperative.id,
      entryDate,
      direction,
      amount: amt,
      category,
      description,
      createdBy: userId,
    },
    include: {
      createdUser: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    success: true,
    data: toJSONSafe(row),
    message: "Transaksi dicatat",
  });
}
