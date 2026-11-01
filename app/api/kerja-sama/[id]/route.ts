import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { localToday } from "@/lib/form-input";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId, permissions } from "@/lib/apbdes/http";
import { deleteAgreement, getAgreement, patchAgreement } from "@/lib/kerja-sama/service";
import { END_REASONS, FIELDS, PARTY_KINDS, STATUS } from "@/lib/kerja-sama/catalog";

type Ctx = { params: Promise<{ id: string }> };
const notFound = () => NextResponse.json({ error: "Kerja sama tidak ditemukan." }, { status: 404 });

export async function GET(req: NextRequest, { params }: Ctx) {
  return attempt("GET /api/kerja-sama/[id]", "Gagal memuat kerja sama", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const r = await getAgreement(prisma, { villageId: ctx.village.id, id, today: localToday() });
    if (!r.ok) return failResponse(r);
    return NextResponse.json({ ...r.data, can: permissions(ctx, "perencanaan"), catalog: { fields: FIELDS, status: STATUS, endReasons: END_REASONS, partyKinds: PARTY_KINDS } });
  });
}

/** Mengubah isi/proses kerja sama (sebagian). Isi terkunci setelah ditandatangani. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return attempt("PATCH /api/kerja-sama/[id]", "Gagal menyimpan kerja sama", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const r = await patchAgreement(prisma, { villageId: ctx.village.id, id, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "village_agreements", id, { before: r.data.before, after: r.data.after });
    return NextResponse.json({ success: true });
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  return attempt("DELETE /api/kerja-sama/[id]", "Gagal menghapus kerja sama", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const r = await deleteAgreement(prisma, { villageId: ctx.village.id, id });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "village_agreements", id, r.data);
    return NextResponse.json({ success: true });
  });
}
