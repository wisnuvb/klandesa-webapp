import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId, yearOf } from "@/lib/apbdes/http";
import { addCostItem, deleteCostItem } from "@/lib/apbdes/dpa";

/** Menambah baris RAB: { year, activityCode, accountCode, description, volume, unit, unitPrice }. */
export async function POST(req: NextRequest) {
  return attempt("POST /api/apbdes/dpa/rab", "Gagal menambah baris RAB", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const body = (await req.json().catch(() => null)) as { year?: unknown } | null;
    const r = await addCostItem(prisma, { villageId: ctx.village.id, year: yearOf(body?.year, 0), input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "apbdes_cost_items", r.data.id);
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}

/** Menghapus baris RAB: ?id=&year=. */
export async function DELETE(req: NextRequest) {
  return attempt("DELETE /api/apbdes/dpa/rab", "Gagal menghapus baris RAB", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId(req.nextUrl.searchParams.get("id") ?? "");
    if (!id) return NextResponse.json({ error: "Parameter tidak valid" }, { status: 400 });
    const r = await deleteCostItem(prisma, { villageId: ctx.village.id, year: yearOf(req.nextUrl.searchParams.get("year"), 0), itemId: id });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "apbdes_cost_items", id);
    return NextResponse.json({ success: true });
  });
}
