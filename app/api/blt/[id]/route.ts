import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId, permissions } from "@/lib/apbdes/http";
import { deleteProgram, getProgram, patchProgram } from "@/lib/blt/service";

const PATCH_KEYS = ["title", "monthly", "totalMonths", "musdesMeetingId", "decreeNumber", "decreeDate", "reportedToRegencyOn", "note"];
type Ctx = { params: Promise<{ id: string }> };
const notFound = () => NextResponse.json({ error: "Program BLT tidak ditemukan." }, { status: 404 });

/** Rincian program: penerima (NIK disamarkan), pembayaran, peringatan. */
export async function GET(req: NextRequest, { params }: Ctx) {
  return attempt("GET /api/blt/[id]", "Gagal memuat program BLT", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const r = await getProgram(prisma, ctx.village.id, id);
    if (!r.ok) return failResponse(r);
    return NextResponse.json({ program: r.data, village: { name: ctx.village.name }, can: permissions(ctx, "blt") });
  });
}

/** Mengubah isian program (sebagian). Setelah SK terbit hanya tanggal pelaporan dan catatan. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return attempt("PATCH /api/blt/[id]", "Gagal menyimpan program BLT", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const body = await req.json().catch(() => null);
    const r = await patchProgram(prisma, { villageId: ctx.village.id, id, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "blt_programs", id, { keys: Object.keys((body as object) ?? {}).filter((k) => PATCH_KEYS.includes(k)) });
    return NextResponse.json({ success: true });
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  return attempt("DELETE /api/blt/[id]", "Gagal menghapus program BLT", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const r = await deleteProgram(prisma, { villageId: ctx.village.id, id });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "blt_programs", id);
    return NextResponse.json({ success: true });
  });
}
