import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { rpjmdesGate } from "@/lib/rpjm/http";
import { saveProgram } from "@/lib/rpjm/service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("POST /api/perencanaan/rpjm/[id]/program", "Gagal menambah program", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const denied = rpjmdesGate(ctx, "update");
    if (denied) return denied;
    const planId = parseIntId((await params).id);
    if (!planId) return NextResponse.json({ error: "RPJM Desa tidak ditemukan." }, { status: 404 });
    const body = await req.json().catch(() => null);
    const r = await saveProgram(prisma, { villageId: ctx.village.id, planId, userId: ctx.userId ?? null, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "rpjm_programs", r.data.id, { planId });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
