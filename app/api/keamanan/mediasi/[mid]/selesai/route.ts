import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { AUDIT, denyUnless } from "@/lib/keamanan/http";
import { completeMediation } from "@/lib/keamanan/kejadian";

type Ctx = { params: Promise<{ mid: string }> };

/** Menyelesaikan berita acara: { outcome, agreement?, referredTo?, heldAt? }. Gerbang: lihat calc.mediationGate. Final setelah ini. */
export async function POST(req: NextRequest, { params }: Ctx) {
  return attempt("POST /api/keamanan/mediasi/[mid]/selesai", "Gagal menyelesaikan mediasi", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const denied = denyUnless(ctx, "update");
    if (denied) return denied;
    const id = parseIntId((await params).mid);
    if (!id) return NextResponse.json({ error: "Mediasi tidak ditemukan." }, { status: 404 });
    const r = await completeMediation(prisma, { villageId: ctx.village.id, id, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "complete", AUDIT.mediation, id, { eventId: r.data.eventId, outcome: r.data.outcome });
    return NextResponse.json({ success: true });
  });
}
