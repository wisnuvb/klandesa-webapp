import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { AUDIT } from "@/lib/keamanan/http";
import { addReportLink } from "@/lib/keamanan/kejadian";
import { permissions } from "@/lib/apbdes/http";

type Ctx = { params: Promise<{ id: string }> };

/** Menautkan Pengaduan warga (baca-saja) ke kejadian: { citizenReportId }. Butuh izin baca Pengaduan juga. */
export async function POST(req: NextRequest, { params }: Ctx) {
  return attempt("POST /api/keamanan/kejadian/[id]/pengaduan", "Gagal menautkan pengaduan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Kejadian tidak ditemukan." }, { status: 404 });
    if (!permissions(ctx, "citizen_reports").read) return NextResponse.json({ error: "Anda tidak berhak membaca Pengaduan warga." }, { status: 403 });
    const r = await addReportLink(prisma, { villageId: ctx.village.id, eventId: id, userId: ctx.userId ?? null, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", AUDIT.link, r.data.id, { eventId: id, citizenReportId: r.data.citizenReportId });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
