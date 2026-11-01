import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId, permissions } from "@/lib/apbdes/http";
import { deletePackage, getPackage, patchPackage } from "@/lib/pengadaan/service";
import { METHODS, MODES, ELEMENTS, ROLES, STATUS } from "@/lib/pengadaan/catalog";

type Ctx = { params: Promise<{ id: string }> };
const notFound = () => NextResponse.json({ error: "Paket pengadaan tidak ditemukan." }, { status: 404 });

export async function GET(req: NextRequest, { params }: Ctx) {
  return attempt("GET /api/pengadaan/[id]", "Gagal memuat paket pengadaan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const r = await getPackage(prisma, { villageId: ctx.village.id, id });
    if (!r.ok) return failResponse(r);
    return NextResponse.json({ ...r.data, can: permissions(ctx), catalog: { modes: MODES, methods: METHODS, status: STATUS, roles: ROLES, elements: ELEMENTS } });
  });
}

/** Mengubah isian paket (sebagian). Kolom struktur hanya pada tahap persiapan; tahap lain dijaga di servis. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return attempt("PATCH /api/pengadaan/[id]", "Gagal menyimpan paket pengadaan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const body = await req.json().catch(() => null);
    const r = await patchPackage(prisma, { villageId: ctx.village.id, id, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "procurement_packages", id, { before: r.data.before, after: r.data.after });
    return NextResponse.json({ success: true });
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  return attempt("DELETE /api/pengadaan/[id]", "Gagal menghapus paket pengadaan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const r = await deletePackage(prisma, { villageId: ctx.village.id, id });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "procurement_packages", id, r.data);
    return NextResponse.json({ success: true });
  });
}
