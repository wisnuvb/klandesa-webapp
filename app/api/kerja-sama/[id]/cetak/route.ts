import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { localToday } from "@/lib/form-input";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { printBundle } from "@/lib/kerja-sama/service";

/** Data cetak surat penawaran dan berita acara kesepakatan (tanpa data pribadi warga). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("GET /api/kerja-sama/[id]/cetak", "Gagal menyiapkan dokumen kerja sama", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Kerja sama tidak ditemukan." }, { status: 404 });
    const r = await printBundle(prisma, { villageId: ctx.village.id, id, today: localToday() });
    if (!r.ok) return failResponse(r);
    return NextResponse.json(r.data);
  });
}
