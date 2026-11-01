import { NextRequest, NextResponse } from "next/server";
import { auditWeb } from "@/lib/audit/web-audit";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { createAmendment } from "@/lib/apbdes/service";
import { failResponse, attempt, yearOf } from "@/lib/apbdes/http";

/** Membuat draf Perubahan APB Desa dari APB Desa terakhir yang ditetapkan: { year, exceptionalReason? }. */
export async function POST(req: NextRequest) {
  return attempt("POST /api/apbdes/perubahan", "Gagal membuat perubahan APB Desa", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const body = (await req.json().catch(() => null)) as { year?: unknown; exceptionalReason?: unknown } | null;
    const r = await createAmendment(prisma, { villageId: ctx.village.id, year: yearOf(body?.year, 0), userId: ctx.userId, exceptionalReason: body?.exceptionalReason });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "apbdes_documents", r.data.id, { version: r.data.version });
    return NextResponse.json({ success: true, id: r.data.id, version: r.data.version }, { status: 201 });
  });
}
