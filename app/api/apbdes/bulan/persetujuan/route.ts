import { NextRequest, NextResponse } from "next/server";
import { auditWeb } from "@/lib/audit/web-audit";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { actOnMonth } from "@/lib/apbdes/service";
import { failResponse, attempt, yearOf } from "@/lib/apbdes/http";

/** Persetujuan Kepala Desa atas buku kas bulan yang sudah diverifikasi Sekretaris Desa (Pasal 67): { year, month }. */
export async function POST(req: NextRequest) {
  return attempt("POST /api/apbdes/bulan/persetujuan", "Gagal menyetujui bulan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const body = (await req.json().catch(() => null)) as { year?: unknown; month?: unknown } | null;
    const r = await actOnMonth(prisma, { villageId: ctx.village.id, userId: ctx.userId, year: yearOf(body?.year, 0), month: Number(body?.month), action: "approve" });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "apbdes_month_closes", `${body?.year}-${body?.month}`, { action: "approve" });
    return NextResponse.json({ success: true, months: r.data });
  });
}
