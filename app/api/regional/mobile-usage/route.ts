import { NextRequest, NextResponse } from "next/server";
import { requireRegionalApi } from "@/lib/regional-api-handler";
import { loadMobileUsage } from "@/lib/regional-mobile-usage";

export const dynamic = "force-dynamic";

/** Pemakaian aplikasi warga per desa (agregat). Hanya desa yang ikut agregat wilayah. */
export async function GET(req: NextRequest) {
  const loaded = await requireRegionalApi(req, "regional_mobile_usage_get");
  if (!loaded.ok) return loaded.response;
  const data = await loadMobileUsage(loaded.ctx.villageIds);
  const byId = new Map(loaded.ctx.villages.map((v) => [v.id, v]));
  return NextResponse.json({
    totals: data.totals,
    villages: data.villages.map((u) => {
      const v = byId.get(u.villageId);
      return { code: v?.code ?? "", name: v?.name ?? "", district: v?.district ?? "", ...u };
    }),
  });
}
