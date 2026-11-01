import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { addDecision } from "@/lib/musdes/service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("POST /api/musdes/[id]/keputusan", "Gagal mencatat keputusan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Musyawarah tidak ditemukan." }, { status: 404 });
    const body = await req.json().catch(() => null);
    const r = await addDecision(prisma, { villageId: ctx.village.id, meetingId: id, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "village_meeting_decisions", r.data.id, { meetingId: id });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
