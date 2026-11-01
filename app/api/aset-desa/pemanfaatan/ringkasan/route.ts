import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { attempt } from "@/lib/apbdes/http";
import { overview } from "@/lib/aset-desa/land-service";

/** Ringkasan pemanfaatan aset: jumlah perjanjian, penerimaan tahun ini, dan peringatan (jatuh tempo, berakhir, kelengkapan). */
export async function GET(req: NextRequest) {
  return attempt("GET /api/aset-desa/pemanfaatan/ringkasan", "Gagal memuat ringkasan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    return NextResponse.json(await overview(prisma, guard.ctx.village.id));
  });
}
