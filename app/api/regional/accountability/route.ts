import { NextRequest, NextResponse } from "next/server";
import { requireRegionalApi } from "@/lib/regional-api-handler";
import { loadAccountability } from "@/lib/mobile/accountability-data";

export const dynamic = "force-dynamic";

/** Rapor layanan per desa di wilayah (90 hari terakhir). Agregat saja; tidak ada data pribadi warga. */
export async function GET(req: NextRequest) {
  const loaded = await requireRegionalApi(req, "regional_accountability_get");
  if (!loaded.ok) return loaded.response;
  const { regional, villageIds, villages } = loaded.ctx;
  const { items, truncated } = await loadAccountability(villageIds);
  const by = new Map(villages.map((v) => [v.id, v]));
  return NextResponse.json({
    scope: regional.scope,
    windowDays: 90,
    truncated,
    villages: items.map((i) => ({ villageId: i.villageId, name: by.get(i.villageId)?.name ?? "—", district: by.get(i.villageId)?.district ?? "—", ...i.current })),
  });
}
