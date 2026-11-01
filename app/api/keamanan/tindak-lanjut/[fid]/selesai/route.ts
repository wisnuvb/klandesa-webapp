import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { AUDIT, denyUnless } from "@/lib/keamanan/http";
import { completeFollowup } from "@/lib/keamanan/kejadian";

type Ctx = { params: Promise<{ fid: string }> };

/** Menandai tindak lanjut selesai: { doneNote? }. */
export async function POST(req: NextRequest, { params }: Ctx) {
  return attempt("POST /api/keamanan/tindak-lanjut/[fid]/selesai", "Gagal menyelesaikan tindak lanjut", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const denied = denyUnless(ctx, "update");
    if (denied) return denied;
    const id = parseIntId((await params).fid);
    if (!id) return NextResponse.json({ error: "Tindak lanjut tidak ditemukan." }, { status: 404 });
    const r = await completeFollowup(prisma, { villageId: ctx.village.id, id, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "complete", AUDIT.followup, id, { eventId: r.data.eventId });
    return NextResponse.json({ success: true });
  });
}
