import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, yearOf } from "@/lib/apbdes/http";
import { isReportKind } from "@/lib/laporan-desa/catalog";
import { loadDocument } from "@/lib/laporan-desa/service";

/** Dokumen cetak lengkap (bagian naratif + lampiran otomatis): ?kind=&year=. */
export async function GET(req: NextRequest) {
  return attempt("GET /api/laporan-desa/dokumen", "Gagal menyusun dokumen", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const sp = req.nextUrl.searchParams;
    const kind = sp.get("kind");
    if (!isReportKind(kind)) return NextResponse.json({ error: "Jenis laporan tidak dikenal" }, { status: 400 });
    const r = await loadDocument(prisma, ctx.village.id, kind, yearOf(sp.get("year")));
    return r.ok ? NextResponse.json({ document: r.data }) : failResponse(r);
  });
}
