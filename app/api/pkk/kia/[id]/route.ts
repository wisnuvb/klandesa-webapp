import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId, permissions } from "@/lib/apbdes/http";
import { isSubscriptionBlocked } from "@/lib/gizi/guard";
import { deletePregnancy, pregnancyDetail } from "@/lib/kia/service";

type Ctx = { params: Promise<{ id: string }> };

/** Rincian satu kehamilan: ringkasan, kemajuan kunjungan 2-1-3, dan riwayat kunjungan. */
export async function GET(req: NextRequest, { params }: Ctx) {
  return attempt("GET /api/pkk/kia/[id]", "Gagal memuat catatan kehamilan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const blocked = isSubscriptionBlocked(guard.ctx.village);
    if (blocked) return blocked;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Catatan tidak ditemukan" }, { status: 404 });
    const r = await pregnancyDetail(prisma, guard.ctx.village.id, id);
    return r.ok ? NextResponse.json({ ...r.data, can: permissions(guard.ctx, "pkk") }, { headers: { "Cache-Control": "no-store" } }) : failResponse(r);
  });
}

/** Hapus catatan yang salah input (hanya bila belum ada kunjungan). */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  return attempt("DELETE /api/pkk/kia/[id]", "Gagal menghapus catatan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const blocked = isSubscriptionBlocked(ctx.village);
    if (blocked) return blocked;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Catatan tidak ditemukan" }, { status: 404 });
    const r = await deletePregnancy(prisma, { villageId: ctx.village.id, pregnancyId: id });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "pregnancies", id);
    return NextResponse.json({ success: true });
  });
}
