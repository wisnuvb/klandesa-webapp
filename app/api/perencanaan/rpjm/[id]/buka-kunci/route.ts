import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, forbidden, parseIntId, permissions } from "@/lib/apbdes/http";
import { rpjmdesGate } from "@/lib/rpjm/http";
import { reopenPlan } from "@/lib/rpjm/service";

/**
 * Membuka kunci RPJM Desa yang sudah ditetapkan untuk perubahan (Permendagri 114/2014 Pasal 28; PP 16/2026 Pasal 148).
 * Hanya Kepala Desa/admin (approve); wajib alasan; tercatat di jejak peristiwa dan log audit.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("POST /api/perencanaan/rpjm/[id]/buka-kunci", "Gagal membuka kunci RPJM Desa", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (!permissions(ctx, "perencanaan").approve) return forbidden("Hanya Kepala Desa atau admin yang dapat membuka kunci RPJM Desa.");
    const denied = rpjmdesGate(ctx, "approve");
    if (denied) return denied;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "RPJM Desa tidak ditemukan." }, { status: 404 });
    const body = await req.json().catch(() => null);
    const r = await reopenPlan(prisma, { villageId: ctx.village.id, id, userId: ctx.userId ?? null, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "reopen", "rpjmdes_plans", id, { reason: (body as { reason?: unknown })?.reason });
    return NextResponse.json({ success: true });
  });
}
