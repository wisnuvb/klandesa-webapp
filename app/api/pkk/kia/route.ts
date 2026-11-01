import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, permissions } from "@/lib/apbdes/http";
import { isSubscriptionBlocked } from "@/lib/gizi/guard";
import { DANGER_SIGNS, PLAN, PROVIDERS } from "@/lib/kia/catalog";
import { maternalBoard, registerPregnancy } from "@/lib/kia/service";

/** Papan ibu hamil yang sedang berjalan, yang perlu diperhatikan di atas, beserta istilah untuk formulir. */
export async function GET(req: NextRequest) {
  return attempt("GET /api/pkk/kia", "Gagal memuat data ibu hamil", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const blocked = isSubscriptionBlocked(guard.ctx.village);
    if (blocked) return blocked;
    const board = await maternalBoard(prisma, guard.ctx.village.id);
    return NextResponse.json({ ...board, terms: { dangerSigns: DANGER_SIGNS, providers: PROVIDERS, plan: PLAN.perTrimester }, can: permissions(guard.ctx, "pkk") }, { headers: { "Cache-Control": "no-store" } });
  });
}

/** Daftarkan kehamilan: { residentId, lmpDate }. HPL dihitung otomatis. */
export async function POST(req: NextRequest) {
  return attempt("POST /api/pkk/kia", "Gagal mendaftarkan kehamilan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const blocked = isSubscriptionBlocked(ctx.village);
    if (blocked) return blocked;
    const r = await registerPregnancy(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    // Data kesehatan: audit hanya memuat id catatan.
    await auditWeb(req, ctx, "create", "pregnancies", r.data.id);
    return NextResponse.json({ success: true, id: r.data.id, edd: r.data.edd }, { status: 201 });
  });
}
