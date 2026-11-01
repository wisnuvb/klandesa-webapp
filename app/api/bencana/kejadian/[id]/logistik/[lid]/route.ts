import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { AUDIT } from "@/lib/bencana/http";
import { removeLogistic } from "@/lib/incident/service";

type Ctx = { params: Promise<{ id: string; lid: string }> };

/** Menghapus catatan distribusi yang salah (selama kejadian belum ditutup). */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  return attempt("DELETE /api/bencana/kejadian/[id]/logistik/[lid]", "Gagal menghapus catatan distribusi", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const p = await params;
    const id = parseIntId(p.id);
    const logisticId = parseIntId(p.lid);
    if (!id || !logisticId) return NextResponse.json({ error: "Catatan tidak ditemukan." }, { status: 404 });
    const r = await removeLogistic(prisma, { domain: "BENCANA", villageId: ctx.village.id, id, logisticId });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", AUDIT.logistic, logisticId, { eventId: id, item: r.data.item, quantity: r.data.quantity, unit: r.data.unit });
    return NextResponse.json({ success: true });
  });
}
