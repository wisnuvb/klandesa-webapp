import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { addWorker } from "@/lib/pktd/service";

/** Menambah pekerja: { residentId? , name?, gender?, priority }. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("POST /api/pktd/[id]/pekerja", "Gagal menambah pekerja", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Kegiatan PKTD tidak ditemukan." }, { status: 404 });
    const r = await addWorker(prisma, { villageId: ctx.village.id, activityId: id, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "pktd_workers", r.data.id, { activityId: id });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
