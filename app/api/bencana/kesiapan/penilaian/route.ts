import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse } from "@/lib/apbdes/http";
import { createAssessment } from "@/lib/bencana/service";

/** Mencatat penilaian ketangguhan (dengan tingkat hasil resmi) atau evaluasi program: { kind, doneOn, level?, referenceNo?, note? }. */
export async function POST(req: NextRequest) {
  return attempt("POST /api/bencana/kesiapan/penilaian", "Gagal mencatat penilaian", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const r = await createAssessment(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "drm_assessments", r.data.id, { kind: r.data.kind, level: r.data.level });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
