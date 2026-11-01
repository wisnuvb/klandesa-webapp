import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { attempt } from "@/lib/apbdes/http";
import { searchArchives } from "@/lib/kepatuhan/service";

/** Mencari berkas Arsip Digital milik desa untuk dipilih sebagai bukti kirim (?q=). Hanya judul dan nama berkas. */
export async function GET(req: NextRequest) {
  return attempt("GET /api/kepatuhan/arsip", "Gagal mencari berkas", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const items = await searchArchives(prisma, { villageId: ctx.village.id, q: req.nextUrl.searchParams.get("q") ?? "" });
    return NextResponse.json({ items });
  });
}
