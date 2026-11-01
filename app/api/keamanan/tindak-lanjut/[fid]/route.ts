import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { AUDIT } from "@/lib/keamanan/http";
import { removeFollowup } from "@/lib/keamanan/kejadian";

type Ctx = { params: Promise<{ fid: string }> };

export async function DELETE(req: NextRequest, { params }: Ctx) {
  return attempt("DELETE /api/keamanan/tindak-lanjut/[fid]", "Gagal menghapus tindak lanjut", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).fid);
    if (!id) return NextResponse.json({ error: "Tindak lanjut tidak ditemukan." }, { status: 404 });
    const r = await removeFollowup(prisma, { villageId: ctx.village.id, id });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", AUDIT.followup, id, { eventId: r.data.eventId });
    return NextResponse.json({ success: true });
  });
}
