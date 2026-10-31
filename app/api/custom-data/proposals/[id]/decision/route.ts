import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { emitRecordEvent } from "@/lib/custom-data/events";
import { failResponse, parseBigId, SCHEMA_ROLES } from "@/lib/custom-data/http";
import { decideProposal } from "@/lib/proposals/service";

/** Setujui atau tolak usulan: { decision: "approve" | "reject", reason? }. Hanya admin atau sekretaris desa. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (!SCHEMA_ROLES.has(ctx.dbUser.role)) return NextResponse.json({ error: "Hanya admin atau sekretaris desa yang dapat memutuskan usulan." }, { status: 403 });
    const id = parseBigId((await params).id);
    if (id == null) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    const body = await req.json().catch(() => null);
    if (body?.decision !== "approve" && body?.decision !== "reject") return NextResponse.json({ error: 'decision harus "approve" atau "reject".' }, { status: 400 });

    const r = await decideProposal(prisma, { villageId: ctx.village.id, id, userId: ctx.userId ?? null, decision: body.decision, reason: body.reason });
    if (!r.ok) return failResponse(r);
    // Audit mencatat id dan keputusan saja; isi usulan tidak dicatat.
    await auditWeb(req, ctx, body.decision, "change_proposals", String(id), { tableId: r.data.tableId, operation: r.data.operation, recordId: r.data.recordId });
    if (r.data.status === "APPLIED" && r.data.recordId) {
      emitRecordEvent(ctx.village.id, r.data.operation === "create" ? "data-kustom.baris.dibuat" : "data-kustom.baris.diubah", r.data.tableId, r.data.recordId);
    }
    return NextResponse.json({ success: true, status: r.data.status, recordId: r.data.recordId });
  } catch (e) {
    console.error("POST /api/custom-data/proposals/[id]/decision error:", e);
    return NextResponse.json({ error: "Gagal memutuskan usulan" }, { status: 500 });
  }
}
