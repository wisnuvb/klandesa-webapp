import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, forbidden, parseIntId, permissions } from "@/lib/apbdes/http";
import { removeDisbursement } from "@/lib/kdmp/service";

/** Menghapus catatan penyaluran (koreksi salah input). Catatan keuangan: hanya admin. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("DELETE /api/kdmp/penyaluran/[id]", "Gagal menghapus catatan penyaluran", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const can = permissions(ctx);
    if (!(can.delete && can.approve)) return forbidden("Catatan penyaluran dana hanya dapat dihapus oleh admin.");
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Catatan penyaluran tidak ditemukan." }, { status: 404 });
    const r = await removeDisbursement(prisma, { villageId: ctx.village.id, id });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "kdmp_disbursements", id, r.data);
    return NextResponse.json({ success: true });
  });
}
