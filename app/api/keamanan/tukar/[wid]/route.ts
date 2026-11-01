import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { todayJakarta } from "@/lib/keamanan/calc";
import { AUDIT, denyUnless } from "@/lib/keamanan/http";
import { decideSwap } from "@/lib/keamanan/ronda";

type Ctx = { params: Promise<{ wid: string }> };

/** Memutuskan permintaan tukar: { decision: APPROVE|REJECT|CANCEL, note? } (alasan wajib untuk REJECT/CANCEL). */
export async function POST(req: NextRequest, { params }: Ctx) {
  return attempt("POST /api/keamanan/tukar/[wid]", "Gagal memutuskan tukar giliran", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const denied = denyUnless(ctx, "update");
    if (denied) return denied;
    const id = parseIntId((await params).wid);
    if (!id) return NextResponse.json({ error: "Permintaan tidak ditemukan." }, { status: 404 });
    const r = await decideSwap(prisma, { villageId: ctx.village.id, id, userId: ctx.userId ?? null, input: await req.json().catch(() => null), today: todayJakarta() });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "decide", AUDIT.swap, id, { groupId: r.data.groupId, decision: r.data.decision, moved: r.data.moved });
    return NextResponse.json({ success: true, ...r.data });
  });
}
