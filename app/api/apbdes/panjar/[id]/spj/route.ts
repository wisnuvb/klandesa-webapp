import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { addPanjarSpj } from "@/lib/apbdes/spp";

/** Pertanggungjawaban panjar: { spjDate, voucherNo, description, amount }. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("POST /api/apbdes/panjar/[id]/spj", "Gagal mencatat pertanggungjawaban", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Panjar tidak ditemukan" }, { status: 404 });
    const r = await addPanjarSpj(prisma, { villageId: ctx.village.id, panjarId: id, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "apbdes_panjar_spj", r.data.id, { panjarId: id });
    return NextResponse.json({ success: true, id: r.data.id, balance: r.data.balance }, { status: 201 });
  });
}
