import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse } from "@/lib/apbdes/http";
import { createCustomItem } from "@/lib/bencana/service";

/** Menambah butir kesiapan buatan desa (belum diverifikasi; tidak ikut skor): { label, status?, note? }. */
export async function POST(req: NextRequest) {
  return attempt("POST /api/bencana/kesiapan/butir", "Gagal menambah butir", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const r = await createCustomItem(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "drm_readiness_items", r.data.id, { label: r.data.label });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
