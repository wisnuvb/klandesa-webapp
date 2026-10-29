import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { currentPeriod, isPeriod } from "@/lib/mobile/fees-logic";
import { loadVillageFeeOverview } from "@/lib/mobile/fees-overview";

/** Rekap iuran dan kas seluruh RT + desa untuk dashboard web (hanya baca; pengelolaan dilakukan di aplikasi). */
export async function GET(req: NextRequest) {
  const loaded = await requireVillageApiContext(req);
  if (!loaded.ok) return loaded.response;
  const p = req.nextUrl.searchParams.get("period");
  const period = isPeriod(p) ? p : currentPeriod(new Date());
  const data = await loadVillageFeeOverview(loaded.ctx.village.id, period);
  return NextResponse.json(data);
}
