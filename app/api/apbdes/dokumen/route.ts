import { NextRequest, NextResponse } from "next/server";
import { auditWeb } from "@/lib/audit/web-audit";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { createDocument } from "@/lib/apbdes/service";
import { failResponse, attempt, yearOf } from "@/lib/apbdes/http";

/** Membuat draf APB Desa awal untuk tahun {year}. */
export async function POST(req: NextRequest) {
  return attempt("POST /api/apbdes/dokumen", "Gagal membuat APB Desa", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const body = (await req.json().catch(() => null)) as { year?: unknown } | null;
    const r = await createDocument(prisma, { villageId: ctx.village.id, year: yearOf(body?.year, 0), userId: ctx.userId });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "apbdes_documents", r.data.id, { version: 0 });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
