import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { parseIsoDate } from "@/lib/form-input";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { printData } from "@/lib/pktd/service";

/** Lembar hari kerja dan upah untuk dicetak (?from=&to=, default 14 hari kerja terakhir). Tanpa NIK. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("GET /api/pktd/[id]/cetak", "Gagal menyiapkan lembar PKTD", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Kegiatan PKTD tidak ditemukan." }, { status: 404 });
    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");
    const f = from ? parseIsoDate(from) : null;
    const t = to ? parseIsoDate(to) : null;
    if ((from && !f) || (to && !t)) return NextResponse.json({ error: "Tanggal tidak valid." }, { status: 400 });
    const r = await printData(prisma, { villageId: ctx.village.id, id, from: f, to: t });
    if (!r.ok) return failResponse(r);
    return NextResponse.json({ ...r.data, village: { name: ctx.village.name } });
  });
}
