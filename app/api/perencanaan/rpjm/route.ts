import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse } from "@/lib/apbdes/http";
import { rpjmCan, rpjmdesGate } from "@/lib/rpjm/http";
import { RPJM_RULES } from "@/lib/rpjm/catalog";
import { createPlan, listPlans } from "@/lib/rpjm/service";

/** Daftar RPJM Desa beserta kemajuan tahapan dan bendera keselarasan. */
export async function GET(req: NextRequest) {
  return attempt("GET /api/perencanaan/rpjm", "Gagal memuat RPJM Desa", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const denied = rpjmdesGate(ctx, "read");
    if (denied) return denied;
    const data = await listPlans(prisma, ctx.village.id, new Date());
    return NextResponse.json({ ...data, can: rpjmCan(ctx), rules: { termYears: RPJM_RULES.termYears } });
  });
}

/** Buat dokumen RPJM Desa baru (default 8 tahun). Dokumen lama dibuat di menu RPJMDes tetap berlaku. */
export async function POST(req: NextRequest) {
  return attempt("POST /api/perencanaan/rpjm", "Gagal membuat RPJM Desa", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const denied = rpjmdesGate(ctx, "create");
    if (denied) return denied;
    const body = await req.json().catch(() => null);
    const r = await createPlan(prisma, { villageId: ctx.village.id, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "rpjmdes_plans", r.data.id, { periodStart: (body as { periodStart?: unknown })?.periodStart, periodEnd: (body as { periodEnd?: unknown })?.periodEnd });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
