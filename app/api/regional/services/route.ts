import { NextRequest, NextResponse } from "next/server";
import { requireRegionalApi } from "@/lib/regional-api-handler";
import { aggregateRegionalServices } from "@/lib/regional-aggregate";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const loaded = await requireRegionalApi(req, "regional_services_get");
  if (!loaded.ok) return loaded.response;
  const { regional, villageIds, villages } = loaded.ctx;
  const data = await aggregateRegionalServices(
    regional.scope,
    villageIds,
    villages,
  );
  return NextResponse.json(data);
}
