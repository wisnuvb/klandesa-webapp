import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { AUDIT } from "@/lib/keamanan/http";
import { patchMediation, removeMediation } from "@/lib/keamanan/kejadian";

type Ctx = { params: Promise<{ mid: string }> };

/** Mengubah jadwal/tempat/mediator mediasi yang masih dijadwalkan. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return attempt("PATCH /api/keamanan/mediasi/[mid]", "Gagal menyimpan mediasi", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).mid);
    if (!id) return NextResponse.json({ error: "Mediasi tidak ditemukan." }, { status: 404 });
    const r = await patchMediation(prisma, { villageId: ctx.village.id, id, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", AUDIT.mediation, id, { eventId: r.data.eventId, keys: r.data.keys });
    return NextResponse.json({ success: true });
  });
}

/** Menghapus mediasi yang dijadwalkan/dibatalkan. Berita acara yang sudah selesai tidak dapat dihapus. */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  return attempt("DELETE /api/keamanan/mediasi/[mid]", "Gagal menghapus mediasi", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).mid);
    if (!id) return NextResponse.json({ error: "Mediasi tidak ditemukan." }, { status: 404 });
    const r = await removeMediation(prisma, { villageId: ctx.village.id, id });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", AUDIT.mediation, id, { eventId: r.data.eventId });
    return NextResponse.json({ success: true });
  });
}
