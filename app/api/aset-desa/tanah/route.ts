import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { attempt } from "@/lib/apbdes/http";
import { can } from "@/lib/tata-kelola/http";
import { listLand } from "@/lib/aset-desa/land-service";
import { RIGHT_KINDS, USAGES } from "@/lib/aset-desa/land-catalog";

/** Daftar tanah (barang golongan tanah) beserta atribut tanah: ?search=&page=&pageSize=. */
export async function GET(req: NextRequest) {
  return attempt("GET /api/aset-desa/tanah", "Gagal memuat data tanah", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Math.min(100000, Number(sp.get("page")) || 1));
    const pageSize = Math.max(1, Math.min(100, Number(sp.get("pageSize")) || 25));
    const search = sp.get("search")?.trim().slice(0, 100) || undefined;
    const list = await listLand(prisma, ctx.village.id, { search, page, pageSize });
    return NextResponse.json({ ...list, can: can("aset_desa", ctx.dbUser.role, ["create", "update"]), terms: { rightKinds: RIGHT_KINDS, usages: USAGES } });
  });
}
