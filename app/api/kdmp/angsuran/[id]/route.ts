import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, forbidden, parseIntId, permissions } from "@/lib/apbdes/http";
import { removeInstallment } from "@/lib/kdmp/service";

/** Menghapus catatan angsuran (koreksi salah input). Catatan keuangan: hanya admin. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("DELETE /api/kdmp/angsuran/[id]", "Gagal menghapus catatan angsuran", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const can = permissions(ctx);
    if (!(can.delete && can.approve)) return forbidden("Catatan angsuran hanya dapat dihapus oleh admin.");
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Catatan angsuran tidak ditemukan." }, { status: 404 });
    const r = await removeInstallment(prisma, { villageId: ctx.village.id, id });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "kdmp_installments", id, r.data);
    return NextResponse.json({ success: true });
  });
}
