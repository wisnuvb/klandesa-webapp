import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { requireFeeActor } from "@/lib/mobile/fees";
import { cashScope } from "@/lib/mobile/fees-report";

/** Batalkan entri kas (tidak dihapus: tetap ada sebagai jejak, tetapi tidak dihitung). Wajib beralasan. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireFeeActor(req, "write");
  if (!g.ok) return g.response;
  const id = Number((await params).id);
  const b = (await req.json().catch(() => null)) as { reason?: unknown } | null;
  const reason = typeof b?.reason === "string" ? b.reason.trim().slice(0, 200) : "";
  if (!Number.isInteger(id)) return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);
  if (reason.length < 3) return mobileError("INVALID_REQUEST", "Tulis alasan pembatalan (minimal 3 huruf).", 400, { field: "reason" });
  const res = await prisma.cashEntry.updateMany({ where: { id, ...cashScope(g.actor), voidedAt: null }, data: { voidedAt: new Date(), voidReason: reason } });
  if (res.count !== 1) return mobileError("INVALID_REQUEST", "Entri kas tidak ditemukan.", 404);
  return new NextResponse(null, { status: 204 });
}
