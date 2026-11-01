import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { coverage } from "@/lib/gizi/immunization";
import { isSubscriptionBlocked } from "@/lib/gizi/guard";

/** Cakupan imunisasi anak 0-24 bulan dan daftar anak yang masih tertinggal dosis. Tanpa NIK. */
export async function GET(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const blocked = isSubscriptionBlocked(guard.ctx.village);
    if (blocked) return blocked;
    return NextResponse.json(await coverage(prisma, guard.ctx.village.id), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("GET /api/pkk/imunisasi/cakupan error:", e);
    return NextResponse.json({ error: "Gagal menghitung cakupan imunisasi" }, { status: 500 });
  }
}
