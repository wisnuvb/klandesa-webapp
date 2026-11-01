import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { searchCandidates } from "@/lib/pktd/service";

/** Mencari warga calon pekerja (?q= nama). Hanya nama, jenis kelamin, dusun/RT/RW; tanpa NIK. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("GET /api/pktd/[id]/warga", "Gagal mencari warga", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Kegiatan PKTD tidak ditemukan." }, { status: 404 });
    const r = await searchCandidates(prisma, { villageId: ctx.village.id, activityId: id, q: (req.nextUrl.searchParams.get("q") ?? "").slice(0, 60) });
    if (!r.ok) return failResponse(r);
    return NextResponse.json({ residents: r.data });
  });
}
