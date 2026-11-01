import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, yearOf } from "@/lib/apbdes/http";
import { buildBundle } from "@/lib/kepatuhan/bundle";

/** Bahan cetak gabungan satu laporan wajib (?item=&year=): tabel/dokumen dari data sistem, tautan, dan daftar lampiran. */
export async function GET(req: NextRequest) {
  return attempt("GET /api/kepatuhan/bundel", "Gagal menyusun bahan cetak", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const sp = req.nextUrl.searchParams;
    const r = await buildBundle(prisma, { villageId: ctx.village.id, year: yearOf(sp.get("year")), itemKey: sp.get("item") ?? "" });
    return r.ok ? NextResponse.json({ bundle: r.data }) : failResponse(r);
  });
}
