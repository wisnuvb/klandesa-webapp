import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse } from "@/lib/apbdes/http";
import { bumdesScope } from "@/lib/bumdes/api-context";
import { createResolution } from "@/lib/bumdes/service";

/**
 * Mencatat keputusan Musyawarah Desa sebagai plafon arus: { kind, musdesMeetingId, decisionId, amount, fiscalYear? (bagi hasil), note? }.
 * Musyawarah Desa harus berjenis "tentang BUM Desa" dan berberita acara final; butir keputusan harus ada di berita acara itu.
 */
export async function POST(req: NextRequest) {
  return attempt("POST /api/bumdes/dana-desa/keputusan", "Gagal mencatat keputusan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const s = await bumdesScope(guard.ctx, { write: true });
    if (!s.ok) return s.response;
    const r = await createResolution(prisma, { villageId: s.ctx.village.id, bumdesId: s.bumdes.id, userId: s.ctx.userId, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, s.ctx, "create", "bumdes_musdes_resolutions", r.data.id);
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
