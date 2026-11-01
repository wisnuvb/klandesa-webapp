import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse } from "@/lib/apbdes/http";
import { addDisbursement } from "@/lib/kdmp/service";

/** Mencatat penyaluran dana KDMP yang diterima desa: { year, receivedOn, amount, reference?, note? }. */
export async function POST(req: NextRequest) {
  return attempt("POST /api/kdmp/penyaluran", "Gagal mencatat penyaluran KDMP", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const r = await addDisbursement(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "kdmp_disbursements", r.data.id, { year: r.data.year, amount: r.data.amount, reference: r.data.reference });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
