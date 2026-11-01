import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, forbidden, parseIntId, permissions } from "@/lib/apbdes/http";
import { chooseWinner } from "@/lib/pengadaan/service";

/** Menetapkan penawaran ini sebagai penyedia terpilih (harus lulus dan berharga terendah). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("POST /api/pengadaan/penawaran/[id]/pemenang", "Gagal menetapkan penyedia terpilih", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (!permissions(ctx).approve) return forbidden("Penyedia terpilih hanya dapat ditetapkan oleh Kepala Desa atau admin.");
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Penawaran tidak ditemukan." }, { status: 404 });
    const r = await chooseWinner(prisma, { villageId: ctx.village.id, offerId: id, canApprove: true });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "procurement_offers", id, { winner: true, packageId: r.data.packageId, providerName: r.data.providerName, price: r.data.price });
    return NextResponse.json({ success: true });
  });
}
