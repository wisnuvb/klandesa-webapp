import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { addBudget } from "@/lib/kerja-sama/service";

/** Menambah baris RAB bersama: { description, amount, bearerId? }. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("POST /api/kerja-sama/[id]/rab", "Gagal menambah baris RAB", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Kerja sama tidak ditemukan." }, { status: 404 });
    const r = await addBudget(prisma, { villageId: ctx.village.id, agreementId: id, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "village_agreements_budget_items", r.data.id, { agreementId: id, description: r.data.description, amount: r.data.amount });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
