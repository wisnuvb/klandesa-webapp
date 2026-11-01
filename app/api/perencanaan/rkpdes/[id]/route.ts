import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId, permissions } from "@/lib/apbdes/http";
import { INCOMING_LEVELS, METHODS, PAGU_SOURCES, TEAM_LIMITS, TEAM_ROLES } from "@/lib/rkpdes/catalog";
import { activityOptions } from "@/lib/apbdes/catalog";
import { deleteDocument, getDocument, patchDocument } from "@/lib/rkpdes/service";

type Ctx = { params: Promise<{ id: string }> };
const notFound = () => NextResponse.json({ error: "RKP Desa tidak ditemukan." }, { status: 404 });

/** Rincian dokumen RKP Desa: tahapan dan tenggat, tim, pagu, program masuk, kegiatan, peringatan kelengkapan. */
export async function GET(req: NextRequest, { params }: Ctx) {
  return attempt("GET /api/perencanaan/rkpdes/[id]", "Gagal memuat RKP Desa", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const d = await getDocument(prisma, ctx.village.id, id, new Date());
    if (!d) return notFound();
    return NextResponse.json({
      ...d,
      can: permissions(ctx, "perencanaan"),
      terms: { paguSources: PAGU_SOURCES, methods: METHODS, teamRoles: TEAM_ROLES, incomingLevels: INCOMING_LEVELS, teamLimits: TEAM_LIMITS, activityCodes: activityOptions() },
    });
  });
}

/** Ubah isian tahapan (tautan musyawarah, tanggal, rujukan, Perdes). Setelah Perdes ditetapkan hanya data usulan yang boleh diubah. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return attempt("PATCH /api/perencanaan/rkpdes/[id]", "Gagal menyimpan RKP Desa", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const body = await req.json().catch(() => null);
    const r = await patchDocument(prisma, { villageId: ctx.village.id, id, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "rkpdes_documents", id, { fields: Object.keys((body as object) ?? {}).slice(0, 20) });
    return NextResponse.json({ success: true });
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  return attempt("DELETE /api/perencanaan/rkpdes/[id]", "Gagal menghapus RKP Desa", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const r = await deleteDocument(prisma, { villageId: ctx.village.id, id });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "rkpdes_documents", id, {});
    return NextResponse.json({ success: true });
  });
}
