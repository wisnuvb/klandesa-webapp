import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { saveParcel } from "@/lib/aset-desa/land-service";

type Ctx = { params: Promise<{ itemId: string }> };

/** Simpan atribut tanah (luas, batas, bukti hak, status pemanfaatan) untuk satu barang golongan tanah. */
export async function PUT(req: NextRequest, { params }: Ctx) {
  return attempt("PUT /api/aset-desa/tanah/[itemId]", "Gagal menyimpan data tanah", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const itemId = parseIntId((await params).itemId);
    if (!itemId) return NextResponse.json({ error: "Barang tidak ditemukan" }, { status: 404 });
    const r = await saveParcel(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, itemId, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "land_parcels", itemId, { areaSqm: r.data.areaSqm, rightKind: r.data.rightKind, usage: r.data.usage });
    return NextResponse.json({ success: true, parcel: r.data });
  });
}
