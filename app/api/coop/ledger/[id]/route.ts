import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  loadCoopApiContextWithCooperative,
  requireManage,
} from "@/lib/coop/api-context";

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const loaded = await loadCoopApiContextWithCooperative(req);
  if (!loaded.ok) return loaded.response;
  const deny = requireManage(loaded.ctx);
  if (deny) return deny;

  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  const { cooperative } = loaded.ctx;

  const result = await prisma.cooperativeLedgerEntry.deleteMany({
    where: { id, cooperativeId: cooperative.id },
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: "Transaksi tidak ditemukan" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    message: "Transaksi dihapus",
  });
}
