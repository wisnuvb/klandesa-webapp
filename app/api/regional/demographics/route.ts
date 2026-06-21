import { NextRequest, NextResponse } from "next/server";
import { requireRegionalApi } from "@/lib/regional-api-handler";
import { aggregateRegionalDemographics } from "@/lib/regional-aggregate";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const loaded = await requireRegionalApi(req, "regional_demographics_get");
  if (!loaded.ok) return loaded.response;
  const { regional, villageIds } = loaded.ctx;
  const data = await aggregateRegionalDemographics(regional.scope, villageIds);
  return NextResponse.json(data);
}
