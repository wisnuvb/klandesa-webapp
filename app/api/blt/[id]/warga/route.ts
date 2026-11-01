import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { searchCandidates } from "@/lib/blt/service";

/** Mencari warga calon penerima (?q= nama, awalan NIK, atau awalan KK). NIK disamarkan. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("GET /api/blt/[id]/warga", "Gagal mencari warga", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Program BLT tidak ditemukan." }, { status: 404 });
    const r = await searchCandidates(prisma, { villageId: ctx.village.id, programId: id, q: (req.nextUrl.searchParams.get("q") ?? "").slice(0, 60) });
    if (!r.ok) return failResponse(r);
    return NextResponse.json({ residents: r.data });
  });
}
