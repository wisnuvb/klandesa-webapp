import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { isSubscriptionBlocked } from "@/lib/gizi/guard";
import { addVisit } from "@/lib/kia/service";

/** Catat kunjungan antenatal. Badan: lihat parseVisitInput (visitDate, provider, hasil pengukuran, dangerSigns[], dst). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("POST /api/pkk/kia/[id]/kunjungan", "Gagal mencatat kunjungan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const blocked = isSubscriptionBlocked(ctx.village);
    if (blocked) return blocked;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Catatan tidak ditemukan" }, { status: 404 });
    const r = await addVisit(prisma, { villageId: ctx.village.id, pregnancyId: id, userId: ctx.userId ?? null, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "pregnancy_visits", r.data.id, { pregnancyId: id });
    return NextResponse.json({ success: true, ...r.data }, { status: 201 });
  });
}
