import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { AUDIT, bencanaCan, hasDetail } from "@/lib/bencana/http";
import { getEvent, patchEvent, removeEvent } from "@/lib/incident/service";

type Ctx = { params: Promise<{ id: string }> };
const notFound = () => NextResponse.json({ error: "Kejadian tidak ditemukan." }, { status: 404 });

/** Rincian kejadian: tindakan, distribusi bantuan (nama penerima tersamar tanpa izin baca rinci), riwayat status. */
export async function GET(req: NextRequest, { params }: Ctx) {
  return attempt("GET /api/bencana/kejadian/[id]", "Gagal memuat kejadian", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const detail = hasDetail(ctx);
    const r = await getEvent(prisma, { domain: "BENCANA", villageId: ctx.village.id, id, detail, logPage: Number(req.nextUrl.searchParams.get("logPage")) || 1 });
    if (!r.ok) return failResponse(r);
    // Membuka daftar penerima per KK secara rinci meninggalkan jejak.
    if (detail && r.data.logistics?.rows.length) await auditWeb(req, ctx, "read_detail", AUDIT.logistic, id, { rows: r.data.logistics.rows.length });
    return NextResponse.json({ ...r.data, can: bencanaCan(ctx), detail });
  });
}

/** Mengubah isian kejadian (sebagian). Kejadian ditutup/dibatalkan tidak dapat diubah. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return attempt("PATCH /api/bencana/kejadian/[id]", "Gagal menyimpan kejadian", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const r = await patchEvent(prisma, { domain: "BENCANA", villageId: ctx.village.id, id, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", AUDIT.event, id, { changed: r.data.changed, before: r.data.before, after: r.data.after });
    return NextResponse.json({ success: true });
  });
}

/** Menghapus kejadian salah catat (hanya Dilaporkan/Dibatalkan, tanpa distribusi bantuan). */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  return attempt("DELETE /api/bencana/kejadian/[id]", "Gagal menghapus kejadian", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const r = await removeEvent(prisma, { domain: "BENCANA", villageId: ctx.village.id, id });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", AUDIT.event, id, { kind: r.data.kind, status: r.data.status, responses: r.data.responses });
    return NextResponse.json({ success: true });
  });
}
