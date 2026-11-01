import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { revertReceipt } from "@/lib/aset-desa/land-service";

type Ctx = { params: Promise<{ id: string }> };

/** Batalkan penerimaan (koreksi): menghapus catatan Buku Kas Umum yang bertaut. Izin dicek sebagai apbdes:delete (api-route-map). */
export async function POST(req: NextRequest, { params }: Ctx) {
  return attempt("POST /api/aset-desa/pemanfaatan/tagihan/[id]/batal-terima", "Gagal membatalkan penerimaan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Tagihan tidak ditemukan" }, { status: 404 });
    const r = await revertReceipt(prisma, { villageId: ctx.village.id, chargeId: id });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "land_charges", id, { reverted: true });
    return NextResponse.json({ success: true });
  });
}
