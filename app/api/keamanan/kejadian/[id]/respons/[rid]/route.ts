import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { AUDIT } from "@/lib/keamanan/http";
import { removeSecurityResponse } from "@/lib/keamanan/kejadian";

type Ctx = { params: Promise<{ id: string; rid: string }> };

export async function DELETE(req: NextRequest, { params }: Ctx) {
  return attempt("DELETE /api/keamanan/kejadian/[id]/respons/[rid]", "Gagal menghapus catatan tindakan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const p = await params;
    const id = parseIntId(p.id);
    const responseId = parseIntId(p.rid);
    if (!id || !responseId) return NextResponse.json({ error: "Catatan tidak ditemukan." }, { status: 404 });
    const r = await removeSecurityResponse(prisma, { villageId: ctx.village.id, id, responseId });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", AUDIT.response, responseId, { eventId: id, kind: r.data.kind });
    return NextResponse.json({ success: true });
  });
}
