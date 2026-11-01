import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { attempt } from "@/lib/apbdes/http";
import { LIMITS, STATUS } from "@/lib/ukm-order/catalog";
import { listForAdmin } from "@/lib/ukm-order/service";

/** Pesanan UKM seluruh desa untuk admin: ?status=&search=&kelolaDesa=1&page=&pageSize=. Tanpa nomor telepon siapa pun. */
export async function GET(req: NextRequest) {
  return attempt("GET /api/ukm-products/pesanan", "Gagal memuat pesanan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Math.min(100000, Number(sp.get("page")) || 1));
    const pageSize = Math.max(1, Math.min(100, Number(sp.get("pageSize")) || LIMITS.adminPageSize));
    const list = await listForAdmin(prisma, {
      villageId: ctx.village.id,
      villageName: ctx.village.name,
      status: sp.get("status") ?? undefined,
      search: sp.get("search")?.trim().slice(0, 100) || undefined,
      managedOnly: sp.get("kelolaDesa") === "1",
      page,
      pageSize,
    });
    return NextResponse.json({ ...list, statuses: STATUS });
  });
}
