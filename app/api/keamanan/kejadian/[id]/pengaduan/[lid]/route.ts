import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { AUDIT } from "@/lib/keamanan/http";
import { removeReportLink } from "@/lib/keamanan/kejadian";

type Ctx = { params: Promise<{ id: string; lid: string }> };

export async function DELETE(req: NextRequest, { params }: Ctx) {
  return attempt("DELETE /api/keamanan/kejadian/[id]/pengaduan/[lid]", "Gagal melepas tautan pengaduan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const p = await params;
    const id = parseIntId(p.id);
    const lid = parseIntId(p.lid);
    if (!id || !lid) return NextResponse.json({ error: "Tautan tidak ditemukan." }, { status: 404 });
    const r = await removeReportLink(prisma, { villageId: ctx.village.id, eventId: id, id: lid });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", AUDIT.link, lid, { eventId: id, citizenReportId: r.data.citizenReportId });
    return NextResponse.json({ success: true });
  });
}
