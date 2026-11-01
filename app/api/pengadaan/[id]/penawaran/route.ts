import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { addOffer } from "@/lib/pengadaan/service";

/** Mencatat penawaran penyedia: { providerName, providerAddress?, offeredOn, price, passed?, evaluationNote?, negotiated? }. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("POST /api/pengadaan/[id]/penawaran", "Gagal mencatat penawaran", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Paket pengadaan tidak ditemukan." }, { status: 404 });
    const r = await addOffer(prisma, { villageId: ctx.village.id, packageId: id, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "procurement_offers", r.data.id, { packageId: id, providerName: r.data.providerName, price: r.data.price });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
