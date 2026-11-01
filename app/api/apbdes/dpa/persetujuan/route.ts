import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, yearOf } from "@/lib/apbdes/http";
import { advancePlan } from "@/lib/apbdes/dpa";

/** Persetujuan Kepala Desa atas DPA yang sudah diverifikasi: { year, activityCode }. */
export async function POST(req: NextRequest) {
  return attempt("POST /api/apbdes/dpa/persetujuan", "Gagal menyetujui DPA", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const body = (await req.json().catch(() => null)) as { year?: unknown; activityCode?: unknown } | null;
    const r = await advancePlan(prisma, { villageId: ctx.village.id, year: yearOf(body?.year, 0), activityCode: String(body?.activityCode ?? ""), action: "approve", userId: ctx.userId });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "apbdes_activity_plans", `${body?.year}-${body?.activityCode}`, { action: "approve", revision: r.data.revision });
    return NextResponse.json({ success: true, status: r.data.status, revision: r.data.revision });
  });
}
