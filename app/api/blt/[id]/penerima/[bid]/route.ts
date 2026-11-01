import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { removeBeneficiary } from "@/lib/blt/service";

/** Menghapus penerima dari program yang masih draf. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; bid: string }> }) {
  return attempt("DELETE /api/blt/[id]/penerima/[bid]", "Gagal menghapus penerima BLT", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const p = await params;
    const id = parseIntId(p.id);
    const bid = parseIntId(p.bid);
    if (!id || !bid) return NextResponse.json({ error: "Penerima tidak ditemukan." }, { status: 404 });
    const r = await removeBeneficiary(prisma, { villageId: ctx.village.id, programId: id, id: bid });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "blt_beneficiaries", bid, { programId: id });
    return NextResponse.json({ success: true });
  });
}
