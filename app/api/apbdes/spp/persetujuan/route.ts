import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { actOnRequest } from "@/lib/apbdes/spp";

/** Kepala Desa menyetujui atau menolak SPP yang sudah diverifikasi: { requestId, decision: "approve" | "reject", note? }. */
export async function POST(req: NextRequest) {
  return attempt("POST /api/apbdes/spp/persetujuan", "Gagal memproses persetujuan SPP", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const body = (await req.json().catch(() => null)) as { requestId?: unknown; decision?: unknown } | null;
    const id = parseIntId(String(body?.requestId ?? ""));
    if (!id) return NextResponse.json({ error: "SPP tidak ditemukan" }, { status: 404 });
    const decision = body?.decision;
    if (decision !== "approve" && decision !== "reject") return NextResponse.json({ error: "Keputusan tidak dikenal" }, { status: 400 });
    const r = await actOnRequest(prisma, { villageId: ctx.village.id, userId: ctx.userId, requestId: id, action: decision, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "apbdes_pay_requests", id, { action: decision });
    return NextResponse.json({ success: true, status: r.data.status });
  });
}
