import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { bumdesScope } from "@/lib/bumdes/api-context";
import { voidResolution } from "@/lib/bumdes/service";

/** Membatalkan keputusan: { reason }. Ditolak selama masih ada catatan arus aktif yang bersandar padanya. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("POST /api/bumdes/dana-desa/keputusan/[id]/batal", "Gagal membatalkan keputusan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const s = await bumdesScope(guard.ctx, { write: true });
    if (!s.ok) return s.response;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Keputusan tidak ditemukan." }, { status: 404 });
    const r = await voidResolution(prisma, { bumdesId: s.bumdes.id, id, userId: s.ctx.userId, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, s.ctx, "void", "bumdes_musdes_resolutions", id, { kind: r.data.kind, amount: r.data.amount });
    return NextResponse.json({ success: true });
  });
}
