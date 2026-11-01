import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { deleteFacility, patchFacility } from "@/lib/kdmp/service";

type Ctx = { params: Promise<{ id: string }> };
const PATCH_KEYS = ["kind", "name", "location", "contract", "operatingOn", "note"];
const notFound = () => NextResponse.json({ error: "Gerai/gudang tidak ditemukan." }, { status: 404 });

/** Mengubah isian gerai/gudang (sebagian), termasuk nilai pekerjaan dan tanggal beroperasi. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return attempt("PATCH /api/kdmp/fasilitas/[id]", "Gagal menyimpan gerai/gudang", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const body = await req.json().catch(() => null);
    const r = await patchFacility(prisma, { villageId: ctx.village.id, id, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "kdmp_facilities", id, { keys: Object.keys((body as object) ?? {}).filter((k) => PATCH_KEYS.includes(k)), before: r.data.before, after: r.data.after });
    return NextResponse.json({ success: true });
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  return attempt("DELETE /api/kdmp/fasilitas/[id]", "Gagal menghapus gerai/gudang", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const r = await deleteFacility(prisma, { villageId: ctx.village.id, id });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "kdmp_facilities", id, r.data);
    return NextResponse.json({ success: true });
  });
}
