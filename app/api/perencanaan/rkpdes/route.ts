import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, permissions } from "@/lib/apbdes/http";
import { CHANGE_REASONS } from "@/lib/rkpdes/catalog";
import { createDocument, listDocuments } from "@/lib/rkpdes/service";

/** Daftar dokumen RKP Desa beserta kemajuan tahapan dan RPJM Desa yang ada. */
export async function GET(req: NextRequest) {
  return attempt("GET /api/perencanaan/rkpdes", "Gagal memuat RKP Desa", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const data = await listDocuments(prisma, ctx.village.id, new Date());
    return NextResponse.json({ ...data, can: permissions(ctx, "perencanaan"), terms: { changeReasons: CHANGE_REASONS } });
  });
}

/** Buat dokumen RKP Desa tahun tertentu (awal, atau perubahan setelah yang awal ditetapkan). */
export async function POST(req: NextRequest) {
  return attempt("POST /api/perencanaan/rkpdes", "Gagal membuat RKP Desa", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const body = await req.json().catch(() => null);
    const r = await createDocument(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "rkpdes_documents", r.data.id, { year: (body as { year?: number })?.year, perubahan: (body as { perubahan?: boolean })?.perubahan === true });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
