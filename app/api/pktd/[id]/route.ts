import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId, permissions } from "@/lib/apbdes/http";
import { deleteActivity, getActivity, patchActivity } from "@/lib/pktd/service";

type Ctx = { params: Promise<{ id: string }> };
const PATCH_KEYS = ["title", "activityCode", "location", "startDate", "endDate", "cost", "plannedWage", "wageMin", "wageMax", "wageBasis", "status", "note"];
const notFound = () => NextResponse.json({ error: "Kegiatan PKTD tidak ditemukan." }, { status: 404 });

export async function GET(req: NextRequest, { params }: Ctx) {
  return attempt("GET /api/pktd/[id]", "Gagal memuat kegiatan PKTD", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const r = await getActivity(prisma, ctx.village.id, id);
    if (!r.ok) return failResponse(r);
    return NextResponse.json({ activity: r.data, village: { name: ctx.village.name }, can: permissions(ctx) });
  });
}

/** Mengubah isian kegiatan (sebagian), termasuk batas upah dan status Berjalan/Selesai. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return attempt("PATCH /api/pktd/[id]", "Gagal menyimpan kegiatan PKTD", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const body = await req.json().catch(() => null);
    const r = await patchActivity(prisma, { villageId: ctx.village.id, id, input: body, allowReopen: permissions(ctx).approve });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "pktd_activities", id, { keys: Object.keys((body as object) ?? {}).filter((k) => PATCH_KEYS.includes(k)), before: r.data.before });
    return NextResponse.json({ success: true });
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  return attempt("DELETE /api/pktd/[id]", "Gagal menghapus kegiatan PKTD", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const r = await deleteActivity(prisma, { villageId: ctx.village.id, id });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "pktd_activities", id);
    return NextResponse.json({ success: true });
  });
}
