import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { AUDIT, bencanaCan } from "@/lib/bencana/http";
import { transition } from "@/lib/incident/service";

type Ctx = { params: Promise<{ id: string }> };

/** Memindah status: { to, note? }. Gerbang di lib/incident/calc.ts; menutup/membuka kembali butuh izin approve (dicek dalam kunci). */
export async function POST(req: NextRequest, { params }: Ctx) {
  return attempt("POST /api/bencana/kejadian/[id]/status", "Gagal mengubah status kejadian", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Kejadian tidak ditemukan." }, { status: 404 });
    const can = bencanaCan(ctx);
    const r = await transition(prisma, { domain: "BENCANA", villageId: ctx.village.id, id, userId: ctx.userId ?? null, input: await req.json().catch(() => null), can: { update: can.update, approve: can.approve } });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "status", AUDIT.event, id, { from: r.data.from, to: r.data.to });
    return NextResponse.json({ success: true, ...r.data });
  });
}
