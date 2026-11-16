import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { attempt } from "@/lib/apbdes/http";
import { isSubscriptionBlocked } from "@/lib/gizi/guard";
import { prisma } from "@/lib/prisma";
import { parseSasaranStatus } from "@/lib/pkk/sasaran";
import { sasaranReport } from "@/lib/pkk/sasaran-data";

/** Data sasaran posyandu per RT: jumlah warga di tiap kelompok sasaran (angka saja, tanpa identitas). ?status=aktif|pindah|semua (bawaan aktif). */
export async function GET(req: NextRequest) {
  return attempt("GET /api/pkk/sasaran", "Gagal menghitung data sasaran", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const blocked = isSubscriptionBlocked(guard.ctx.village);
    if (blocked) return blocked;
    const status = parseSasaranStatus(req.nextUrl.searchParams.get("status"));
    if (!status) return NextResponse.json({ error: "Status warga tidak dikenal" }, { status: 400 });
    return NextResponse.json(await sasaranReport(prisma, guard.ctx.village.id, status), { headers: { "Cache-Control": "no-store" } });
  });
}
