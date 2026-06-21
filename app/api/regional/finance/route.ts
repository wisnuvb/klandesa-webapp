import { NextRequest, NextResponse } from "next/server";
import { requireRegionalApi } from "@/lib/regional-api-handler";
import { aggregateRegionalFinance } from "@/lib/regional-aggregate";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const loaded = await requireRegionalApi(req, "regional_finance_get");
  if (!loaded.ok) return loaded.response;
  const { regional, villageIds, villages, req: request } = loaded.ctx;
  const yearParam = request.nextUrl.searchParams.get("year");
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
  const data = await aggregateRegionalFinance(
    regional.scope,
    villageIds,
    villages,
    Number.isFinite(year) ? year : new Date().getFullYear(),
  );
  return NextResponse.json(data);
}
