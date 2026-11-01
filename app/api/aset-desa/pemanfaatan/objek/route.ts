import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { attempt } from "@/lib/apbdes/http";
import { leasableItems } from "@/lib/aset-desa/land-service";

/** Pilihan objek perjanjian: barang yang masih tercatat dan boleh dimanfaatkan (?search=). */
export async function GET(req: NextRequest) {
  return attempt("GET /api/aset-desa/pemanfaatan/objek", "Gagal memuat objek", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const search = req.nextUrl.searchParams.get("search")?.trim().slice(0, 100) || undefined;
    return NextResponse.json({ items: await leasableItems(prisma, guard.ctx.village.id, search) });
  });
}
