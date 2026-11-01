import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { budgetOptions } from "@/lib/apbdes/funding";
import { attempt, yearOf } from "@/lib/apbdes/http";

/** Pasangan kegiatan-rekening belanja pada APB Desa yang berlaku beserta sisa anggaran (?year=), untuk mencatat pembayaran modul ke Buku Kas Umum. */
export async function GET(req: NextRequest) {
  return attempt("GET /api/apbdes/opsi-belanja", "Gagal memuat pilihan belanja", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const year = yearOf(req.nextUrl.searchParams.get("year"));
    return NextResponse.json({ year, ...(await budgetOptions(prisma, ctx.village.id, year)) });
  });
}
