import { NextRequest, NextResponse } from "next/server";
import { auditWeb } from "@/lib/audit/web-audit";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { normalizeVillageRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { adoptDocument } from "@/lib/apbdes/service";
import { amendmentWarnings } from "@/lib/apbdes/dpa";
import { failResponse, forbidden, attempt, parseIntId, permissions } from "@/lib/apbdes/http";

/** Menetapkan draf setelah Peraturan Desa disahkan: { regulationNumber, regulationDate }. Setelah itu dokumen terkunci. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("POST /api/apbdes/dokumen/[id]/tetapkan", "Gagal menetapkan dokumen", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (!permissions(ctx).update || normalizeVillageRole(ctx.dbUser.role) === "staff") return forbidden("Penetapan APB Desa dilakukan admin atau sekretaris desa");
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Dokumen tidak ditemukan" }, { status: 404 });
    const body = (await req.json().catch(() => null)) as { regulationNumber?: unknown; regulationDate?: unknown } | null;
    const r = await adoptDocument(prisma, { villageId: ctx.village.id, documentId: id, regulationNumber: body?.regulationNumber, regulationDate: body?.regulationDate });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "apbdes_documents", id, { status: "DITETAPKAN", regulationNumber: body?.regulationNumber });
    // Peringatan tambahan hanya informasi: kegagalannya tidak boleh menutupi penetapan yang sudah berhasil.
    const extra = await amendmentWarnings(prisma, ctx.village.id, id).catch(() => []);
    return NextResponse.json({ success: true, warnings: [...r.data.warnings, ...extra] });
  });
}
