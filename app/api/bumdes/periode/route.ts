import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, yearOf } from "@/lib/apbdes/http";
import { bumdesScope } from "@/lib/bumdes/api-context";
import { actOnPeriod, getPeriods } from "@/lib/bumdes/service";

/** Status penutupan periode semester satu tahun (?year=) beserta log tutup/buka. */
export async function GET(req: NextRequest) {
  return attempt("GET /api/bumdes/periode", "Gagal memuat periode", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const s = await bumdesScope(guard.ctx);
    if (!s.ok) return s.response;
    const r = await getPeriods(prisma, s.bumdes.id, yearOf(req.nextUrl.searchParams.get("year")), new Date());
    if (!r.ok) return failResponse(r);
    return NextResponse.json({ ...r.data, canManage: s.canManage });
  });
}

/** Menutup atau membuka kembali periode: { year, half: 1|2, action: "tutup"|"buka", reason? (wajib untuk buka) }. */
export async function POST(req: NextRequest) {
  return attempt("POST /api/bumdes/periode", "Gagal memproses periode", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const s = await bumdesScope(guard.ctx, { write: true });
    if (!s.ok) return s.response;
    const input = await req.json().catch(() => null);
    const r = await actOnPeriod(prisma, { bumdesId: s.bumdes.id, userId: s.ctx.userId, input });
    if (!r.ok) return failResponse(r);
    const b = (input ?? {}) as Record<string, unknown>;
    await auditWeb(req, s.ctx, b.action === "buka" ? "reopen" : "close", "bumdes_period_closes", `${String(b.year)}-${String(b.half)}`, { reason: b.action === "buka" ? String(b.reason ?? "").slice(0, 300) : undefined });
    return NextResponse.json({ ...r.data, canManage: s.canManage });
  });
}
