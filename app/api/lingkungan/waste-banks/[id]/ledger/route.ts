import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { ledger } from "@/lib/lingkungan/waste-bank";
import { failResponse, parseIntId } from "@/lib/tata-kelola/http";

/** Papan bank sampah: harga per jenis, nasabah dan saldo, transaksi terbaru, rekap bulan ini. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Bank sampah tidak ditemukan" }, { status: 404 });
    const r = await ledger(prisma, guard.ctx.village.id, id);
    return r.ok ? NextResponse.json(r.data, { headers: { "Cache-Control": "no-store" } }) : failResponse(r);
  } catch (e) {
    console.error("GET waste-banks/[id]/ledger error:", e);
    return NextResponse.json({ error: "Gagal memuat bank sampah" }, { status: 500 });
  }
}
