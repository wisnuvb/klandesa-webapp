import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { rpjmCan, rpjmdesGate } from "@/lib/rpjm/http";
import { activityOptions } from "@/lib/apbdes/catalog";
import { RPJM_RULES } from "@/lib/rpjm/catalog";
import { TERMS, getPlan, patchPlan } from "@/lib/rpjm/service";

type Ctx = { params: Promise<{ id: string }> };
const notFound = () => NextResponse.json({ error: "RPJM Desa tidak ditemukan." }, { status: 404 });

/** Rincian RPJM Desa: tahapan, gerbang, tim, program per bidang per tahun, matriks anggaran, bendera keselarasan. */
export async function GET(req: NextRequest, { params }: Ctx) {
  return attempt("GET /api/perencanaan/rpjm/[id]", "Gagal memuat RPJM Desa", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const denied = rpjmdesGate(ctx, "read");
    if (denied) return denied;
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const d = await getPlan(prisma, ctx.village.id, id, new Date());
    if (!d) return notFound();
    return NextResponse.json({
      ...d,
      village: { name: ctx.village.name },
      can: rpjmCan(ctx),
      terms: { ...TERMS, activityCodes: activityOptions(), rules: { termYears: RPJM_RULES.termYears, teamMin: RPJM_RULES.teamMin } },
    });
  });
}

/** Ubah isian tahapan dan isi rancangan. Setelah Perdes ditetapkan hanya catatan SDGs yang boleh diubah. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return attempt("PATCH /api/perencanaan/rpjm/[id]", "Gagal menyimpan RPJM Desa", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const denied = rpjmdesGate(ctx, "update");
    if (denied) return denied;
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const body = await req.json().catch(() => null);
    const r = await patchPlan(prisma, { villageId: ctx.village.id, id, userId: ctx.userId ?? null, canApprove: rpjmCan(ctx).approve, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "rpjmdes_plans", id, { fields: Object.keys((body as object) ?? {}).slice(0, 20) });
    return NextResponse.json({ success: true });
  });
}
