import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { attempt, permissions } from "@/lib/apbdes/http";
import { searchReports } from "@/lib/keamanan/kejadian";

/** Cari Pengaduan warga menurut judul (?q= minimal 3 huruf) untuk ditautkan ke kejadian. Tanpa pelapor/isi; butuh izin baca Pengaduan juga. */
export async function GET(req: NextRequest) {
  return attempt("GET /api/keamanan/pengaduan", "Gagal mencari pengaduan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (!permissions(ctx, "citizen_reports").read) return NextResponse.json({ error: "Anda tidak berhak membaca Pengaduan warga." }, { status: 403 });
    const rows = await searchReports(prisma, { villageId: ctx.village.id, q: req.nextUrl.searchParams.get("q") ?? "" });
    return NextResponse.json({ rows });
  });
}
