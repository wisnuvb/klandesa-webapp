import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId, permissions } from "@/lib/apbdes/http";
import { KINDS, STATUS, UNSUR } from "@/lib/musdes/catalog";
import { deleteMeeting, getMeeting, updateMeeting } from "@/lib/musdes/service";

type Ctx = { params: Promise<{ id: string }> };

/** Rincian satu musyawarah: peserta, keputusan, berita acara, peringatan keterwakilan. */
export async function GET(req: NextRequest, { params }: Ctx) {
  return attempt("GET /api/musdes/[id]", "Gagal memuat musyawarah", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Musyawarah tidak ditemukan." }, { status: 404 });
    const d = await getMeeting(prisma, ctx.village.id, id);
    if (!d) return NextResponse.json({ error: "Musyawarah tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ ...d, village: { name: ctx.village.name }, can: permissions(ctx, "perencanaan"), terms: { kinds: KINDS, statuses: STATUS, unsur: UNSUR } });
  });
}

/** Ubah jadwal/isi musyawarah (hanya selama belum final atau dibatalkan). */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return attempt("PATCH /api/musdes/[id]", "Gagal menyimpan musyawarah", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Musyawarah tidak ditemukan." }, { status: 404 });
    const body = await req.json().catch(() => null);
    const r = await updateMeeting(prisma, { villageId: ctx.village.id, id, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "village_meetings", id, {});
    return NextResponse.json({ success: true });
  });
}

/** Hapus musyawarah yang masih dijadwalkan atau sudah dibatalkan. */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  return attempt("DELETE /api/musdes/[id]", "Gagal menghapus musyawarah", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Musyawarah tidak ditemukan." }, { status: 404 });
    const r = await deleteMeeting(prisma, { villageId: ctx.village.id, id });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "village_meetings", id, {});
    return NextResponse.json({ success: true });
  });
}
