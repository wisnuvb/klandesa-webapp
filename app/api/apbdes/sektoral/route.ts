import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId, permissions, yearOf } from "@/lib/apbdes/http";
import { addProgram, deleteProgram, listPrograms } from "@/lib/apbdes/sektoral";

/** Program sektoral/daerah yang masuk ke desa (?year=), Lampiran T.4. */
export async function GET(req: NextRequest) {
  return attempt("GET /api/apbdes/sektoral", "Gagal memuat program", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const year = yearOf(req.nextUrl.searchParams.get("year"));
    return NextResponse.json({ year, programs: await listPrograms(prisma, guard.ctx.village.id, year), can: permissions(guard.ctx) });
  });
}

/** Menambah program: { year, programName, activityKind, location?, volume, unit, amount, fundSource }. */
export async function POST(req: NextRequest) {
  return attempt("POST /api/apbdes/sektoral", "Gagal menambah program", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const body = (await req.json().catch(() => null)) as { year?: unknown } | null;
    const r = await addProgram(prisma, { villageId: ctx.village.id, year: yearOf(body?.year, 0), input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "apbdes_external_programs", r.data.id);
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}

/** Menghapus program: ?id=. */
export async function DELETE(req: NextRequest) {
  return attempt("DELETE /api/apbdes/sektoral", "Gagal menghapus program", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId(req.nextUrl.searchParams.get("id") ?? "");
    if (!id) return NextResponse.json({ error: "Parameter tidak valid" }, { status: 400 });
    const r = await deleteProgram(prisma, { villageId: ctx.village.id, id });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "apbdes_external_programs", id);
    return NextResponse.json({ success: true });
  });
}
