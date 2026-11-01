import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse } from "@/lib/apbdes/http";
import { importDisasterPoints } from "@/lib/bencana/service";

/** Menyalin titik rawan lama (Lingkungan Hidup > titik rawan bencana) menjadi daftar ancaman; yang sudah diimpor dilewati. */
export async function POST(req: NextRequest) {
  return attempt("POST /api/bencana/impor-ancaman", "Gagal mengimpor titik rawan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const r = await importDisasterPoints(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "import", "drm_hazards", 0, r.data);
    return NextResponse.json({ success: true, ...r.data });
  });
}
