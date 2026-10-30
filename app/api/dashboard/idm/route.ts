import { NextRequest, NextResponse } from "next/server";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";
import { requireVillageApiContext } from "@/lib/api-village-context";
import {
  getDashboardIdm,
  parseIdmVillageCodeFromSettings,
  type DashboardIdmSnapshot,
} from "@/lib/dashboard/idm";

/** Status IDM desa. Dipisah dari /api/dashboard/stats karena bergantung pada server Kemendesa yang bisa lambat. */
export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const url = new URL(req.url);
    const nowYear = new Date().getFullYear();
    const requestedIdmYear = Number(url.searchParams.get("idmYear") ?? "");
    const year =
      Number.isFinite(requestedIdmYear) &&
      requestedIdmYear >= 2015 &&
      requestedIdmYear <= nowYear
        ? requestedIdmYear
        : nowYear;

    const historySizeRequested = Number(url.searchParams.get("idmHistory") ?? "");
    const historySize =
      Number.isFinite(historySizeRequested) &&
      historySizeRequested >= 2 &&
      historySizeRequested <= 10
        ? historySizeRequested
        : 5;

    const villageCode = parseIdmVillageCodeFromSettings(village.settings);
    if (!villageCode) {
      const idm: DashboardIdmSnapshot = {
        configured: false,
        year,
        villageCode: "",
        cached: false,
        sourceUrl: "",
        score: null,
        status: null,
        subScores: { social: null, economic: null, ecology: null },
        error: null,
      };
      return NextResponse.json({ idm, idmHistory: [] });
    }

    return NextResponse.json(await getDashboardIdm({ villageCode, year, historySize }));
  } catch (err) {
    console.error("GET /api/dashboard/idm error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
