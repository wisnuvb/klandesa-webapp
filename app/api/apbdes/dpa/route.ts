import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, permissions, yearOf } from "@/lib/apbdes/http";
import { planOverview, savePlan } from "@/lib/apbdes/dpa";

/** DPA semua kegiatan pada APB Desa yang berlaku (?year=): rencana kerja, rencana penarikan (RAK), RAB, status. */
export async function GET(req: NextRequest) {
  return attempt("GET /api/apbdes/dpa", "Gagal memuat DPA", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const year = yearOf(req.nextUrl.searchParams.get("year"));
    return NextResponse.json({ year, ...(await planOverview(prisma, ctx.village.id, year, { detail: true })), can: permissions(ctx) });
  });
}

/** Menyimpan Rencana Kerja Kegiatan: { year, activityCode, executorName, location, outputName, outputVolume, outputUnit, target, team, startMonth, endMonth }. */
export async function PUT(req: NextRequest) {
  return attempt("PUT /api/apbdes/dpa", "Gagal menyimpan DPA", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const body = (await req.json().catch(() => null)) as { year?: unknown; activityCode?: unknown } | null;
    const year = yearOf(body?.year, 0);
    const r = await savePlan(prisma, { villageId: ctx.village.id, year, activityCode: String(body?.activityCode ?? ""), input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "apbdes_activity_plans", r.data.id, { year, activityCode: body?.activityCode });
    return NextResponse.json({ success: true });
  });
}
