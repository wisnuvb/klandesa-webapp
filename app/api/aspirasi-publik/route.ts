import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { attempt } from "@/lib/apbdes/http";
import { permissions } from "@/lib/apbdes/http";
import { listForVillage, villageClaimState } from "@/lib/aspirasi/service";
import { pageParam } from "@/lib/aspirasi/http";
import { photoUrls } from "@/lib/aspirasi/photo-urls";

/** Dasbor desa: status klaim wilayah + aspirasi warga yang tayang di wilayah yang dikelola desa ini. */
export async function GET(req: NextRequest) {
  return attempt("GET /api/aspirasi-publik", "Gagal memuat aspirasi", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const sp = req.nextUrl.searchParams;
    const [state, list] = await Promise.all([
      villageClaimState(prisma, ctx.village.id),
      listForVillage(prisma, ctx.village.id, { progress: sp.get("progress") ?? undefined, page: pageParam(sp.get("page")) }),
    ]);
    return NextResponse.json({
      can: permissions(ctx, "citizen_reports"),
      village: { name: ctx.village.name, district: ctx.village.district, regency: ctx.village.regency, province: ctx.village.province },
      area: state.area,
      claim: state.claim,
      total: list.total,
      counts: list.counts,
      items: list.items.map(({ photoKeys, ...rest }) => ({ ...rest, photos: photoUrls(photoKeys) })),
    });
  });
}
