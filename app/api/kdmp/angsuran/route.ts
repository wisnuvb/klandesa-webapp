import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse } from "@/lib/apbdes/http";
import { addInstallment } from "@/lib/kdmp/service";

/** Mencatat angsuran dari dana KDMP: { year, paidOn, amount, payee, facilityId?, reference?, note? }. */
export async function POST(req: NextRequest) {
  return attempt("POST /api/kdmp/angsuran", "Gagal mencatat angsuran KDMP", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const r = await addInstallment(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "kdmp_installments", r.data.id, { year: r.data.year, amount: r.data.amount, facilityId: r.data.facilityId, payee: r.data.payee, reference: r.data.reference });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
