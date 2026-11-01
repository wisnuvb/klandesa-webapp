import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, yearOf } from "@/lib/apbdes/http";
import { saveCashPlan } from "@/lib/apbdes/dpa";

/** Rencana penarikan bulanan satu rekening: { year, activityCode, accountCode, months: [12 jumlah] }. */
export async function PUT(req: NextRequest) {
  return attempt("PUT /api/apbdes/dpa/rak", "Gagal menyimpan rencana penarikan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const body = (await req.json().catch(() => null)) as { year?: unknown } | null;
    const r = await saveCashPlan(prisma, { villageId: ctx.village.id, year: yearOf(body?.year, 0), input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "apbdes_cash_plans", `${body?.year}`, { planned: r.data.planned });
    return NextResponse.json({ success: true, planned: r.data.planned });
  });
}
