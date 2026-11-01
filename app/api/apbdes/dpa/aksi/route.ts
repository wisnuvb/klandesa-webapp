import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { normalizeVillageRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, forbidden, permissions, yearOf } from "@/lib/apbdes/http";
import { advancePlan } from "@/lib/apbdes/dpa";

/** Verifikasi Sekretaris Desa (verify) atau buka kembali ke draf (reopen): { year, activityCode, action }. Persetujuan lewat /dpa/persetujuan. */
export async function POST(req: NextRequest) {
  return attempt("POST /api/apbdes/dpa/aksi", "Gagal memproses DPA", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const body = (await req.json().catch(() => null)) as { year?: unknown; activityCode?: unknown; action?: unknown } | null;
    const action = body?.action;
    if (action !== "verify" && action !== "reopen") return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
    if (!permissions(ctx).update || normalizeVillageRole(ctx.dbUser.role) === "staff") return forbidden("Verifikasi DPA dilakukan Sekretaris Desa");
    const r = await advancePlan(prisma, { villageId: ctx.village.id, year: yearOf(body?.year, 0), activityCode: String(body?.activityCode ?? ""), action });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "apbdes_activity_plans", `${body?.year}-${body?.activityCode}`, { action });
    return NextResponse.json({ success: true, status: r.data.status });
  });
}
