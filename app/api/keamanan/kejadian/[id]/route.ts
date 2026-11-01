import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { todayJakarta } from "@/lib/keamanan/calc";
import { AUDIT, hasDetail, keamananCan } from "@/lib/keamanan/http";
import { getSecurityEvent, patchSecurityEvent, removeSecurityEvent } from "@/lib/keamanan/kejadian";
import { permissions } from "@/lib/apbdes/http";

type Ctx = { params: Promise<{ id: string }> };
const notFound = () => NextResponse.json({ error: "Kejadian tidak ditemukan." }, { status: 404 });

/** Rincian kejadian: tindakan, mediasi (nama pihak tersamar tanpa izin baca rinci), tindak lanjut, dan tautan pengaduan. */
export async function GET(req: NextRequest, { params }: Ctx) {
  return attempt("GET /api/keamanan/kejadian/[id]", "Gagal memuat kejadian", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const detail = hasDetail(ctx);
    const r = await getSecurityEvent(prisma, { villageId: ctx.village.id, id, detail, showReports: permissions(ctx, "citizen_reports").read, today: todayJakarta() });
    if (!r.ok) return failResponse(r);
    // Membuka nama pihak mediasi secara rinci meninggalkan jejak.
    if (detail && r.data.mediations.some((m) => m.parties.length)) await auditWeb(req, ctx, "read_detail", AUDIT.party, id, { mediations: r.data.mediations.length });
    return NextResponse.json({ ...r.data, can: keamananCan(ctx), detail });
  });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  return attempt("PATCH /api/keamanan/kejadian/[id]", "Gagal menyimpan kejadian", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const r = await patchSecurityEvent(prisma, { villageId: ctx.village.id, id, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", AUDIT.event, id, { changed: r.data.changed, before: r.data.before, after: r.data.after });
    return NextResponse.json({ success: true });
  });
}

/** Menghapus kejadian salah catat (Dilaporkan/Dibatalkan, tanpa mediasi atau tindak lanjut). */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  return attempt("DELETE /api/keamanan/kejadian/[id]", "Gagal menghapus kejadian", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const r = await removeSecurityEvent(prisma, { villageId: ctx.village.id, id });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", AUDIT.event, id, { kind: r.data.kind, status: r.data.status, responses: r.data.responses });
    return NextResponse.json({ success: true });
  });
}
