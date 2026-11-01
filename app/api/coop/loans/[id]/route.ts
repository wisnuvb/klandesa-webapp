import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadCoopApiContextWithCooperative } from "@/lib/coop/api-context";
import { getLoan } from "@/lib/coop/savings-loans";

/** Rincian pinjaman: jadwal angsuran (dihitung), pembayaran, dan sisa. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const loaded = await loadCoopApiContextWithCooperative(req);
  if (!loaded.ok) return loaded.response;
  const raw = (await params).id;
  if (!/^\d{1,10}$/.test(raw)) return NextResponse.json({ error: "Pinjaman tidak ditemukan" }, { status: 404 });
  const r = await getLoan(prisma, loaded.ctx.cooperative.id, Number(raw));
  if (!r.ok) return NextResponse.json({ error: r.errors[0] }, { status: r.status });
  return NextResponse.json({ loan: r.data, canManage: loaded.ctx.access.manage }, { headers: { "Cache-Control": "no-store" } });
}
