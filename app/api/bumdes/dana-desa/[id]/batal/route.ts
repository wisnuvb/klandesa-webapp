import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, forbidden, parseIntId, permissions } from "@/lib/apbdes/http";
import { bumdesScope } from "@/lib/bumdes/api-context";
import { voidFlow } from "@/lib/bumdes/service";

/** Membatalkan catatan arus: { reason }. Catatan Buku Kas Umum APB Desa yang dibuatnya ikut dihapus (ditolak bila bulan BKU sudah ditutup). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("POST /api/bumdes/dana-desa/[id]/batal", "Gagal membatalkan catatan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const s = await bumdesScope(guard.ctx, { write: true });
    if (!s.ok) return s.response;
    const can = permissions(s.ctx, "apbdes");
    if (!(can.delete && can.create)) return forbidden("Anda tidak berwenang menghapus catatan Buku Kas Umum APB Desa.");
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Catatan tidak ditemukan." }, { status: 404 });
    const r = await voidFlow(prisma, { villageId: s.ctx.village.id, bumdesId: s.bumdes.id, id, userId: s.ctx.userId, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, s.ctx, "void", "bumdes_village_flows", id, { kind: r.data.kind, amount: r.data.amount });
    return NextResponse.json({ success: true });
  });
}
