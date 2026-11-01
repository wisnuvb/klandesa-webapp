import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse } from "@/lib/apbdes/http";
import { saveSetting } from "@/lib/pengadaan/service";

/** Ambang nilai metode milik desa: { directLimit?, offerLimit?, basisNote? } (kosong = tanpa saran). */
export async function PUT(req: NextRequest) {
  return attempt("PUT /api/pengadaan/pengaturan", "Gagal menyimpan ambang metode", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const r = await saveSetting(prisma, { villageId: ctx.village.id, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "procurement_settings", ctx.village.id, { direct: r.data.direct, offer: r.data.offer });
    return NextResponse.json({ success: true });
  });
}
