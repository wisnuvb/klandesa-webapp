import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { printBundle } from "@/lib/pengadaan/service";

/** Data cetak SK TPK, BA negosiasi, SPK, dan BAST (tanpa data pribadi warga). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("GET /api/pengadaan/[id]/cetak", "Gagal menyiapkan dokumen pengadaan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Paket pengadaan tidak ditemukan." }, { status: 404 });
    const r = await printBundle(prisma, { villageId: ctx.village.id, id });
    if (!r.ok) return failResponse(r);
    return NextResponse.json(r.data);
  });
}
