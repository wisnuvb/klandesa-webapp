import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { receiveCharge } from "@/lib/aset-desa/land-service";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Catat tagihan diterima: { receivedOn, channel: "TUNAI"|"BANK", voucherNo? }. Sekaligus mencatat penerimaan PADes di Buku Kas Umum.
 * Izin dicek sebagai apbdes:create (api-route-map), karena ini menulis ke Buku Kas Umum.
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  return attempt("POST /api/aset-desa/pemanfaatan/tagihan/[id]/terima", "Gagal mencatat penerimaan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Tagihan tidak ditemukan" }, { status: 404 });
    const r = await receiveCharge(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, chargeId: id, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "land_charges", id, { entryId: r.data.entryId, year: r.data.year });
    return NextResponse.json({ success: true, ...r.data });
  });
}
