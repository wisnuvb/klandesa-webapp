import { NextRequest, NextResponse } from "next/server";
import { auditWeb } from "@/lib/audit/web-audit";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { addLine } from "@/lib/apbdes/service";
import { failResponse, attempt, parseIntId } from "@/lib/apbdes/http";

/** Menambah baris anggaran ke draf dokumen. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("POST /api/apbdes/dokumen/[id]/baris", "Gagal menambah baris anggaran", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Dokumen tidak ditemukan" }, { status: 404 });
    const body = await req.json().catch(() => null);
    const r = await addLine(prisma, { villageId: ctx.village.id, documentId: id, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "apbdes_lines", r.data.id, { documentId: id, accountCode: r.data.accountCode, amount: r.data.amount });
    return NextResponse.json({ success: true, line: r.data }, { status: 201 });
  });
}
