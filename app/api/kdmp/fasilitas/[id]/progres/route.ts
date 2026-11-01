import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { addProgress, listProgress } from "@/lib/kdmp/service";

type Ctx = { params: Promise<{ id: string }> };
const notFound = () => NextResponse.json({ error: "Gerai/gudang tidak ditemukan." }, { status: 404 });

/** Riwayat progres fisik satu gerai/gudang (terbaru di atas). */
export async function GET(req: NextRequest, { params }: Ctx) {
  return attempt("GET /api/kdmp/fasilitas/[id]/progres", "Gagal memuat riwayat progres", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const r = await listProgress(prisma, { villageId: ctx.village.id, id });
    if (!r.ok) return failResponse(r);
    return NextResponse.json(r.data);
  });
}

/** Mencatat progres fisik: { recordedOn, progressPct (0-100), note? }. */
export async function POST(req: NextRequest, { params }: Ctx) {
  return attempt("POST /api/kdmp/fasilitas/[id]/progres", "Gagal mencatat progres", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const r = await addProgress(prisma, { villageId: ctx.village.id, id, userId: ctx.userId ?? null, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "kdmp_facility_progress", r.data.recordId, { facilityId: id, recordedOn: r.data.recordedOn, progressPct: r.data.progressPct });
    return NextResponse.json({ success: true, progressPct: r.data.progressPct }, { status: 201 });
  });
}
