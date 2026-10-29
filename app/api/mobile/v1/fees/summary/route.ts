import { NextRequest, NextResponse } from "next/server";
import { mobileError } from "@/lib/mobile/context";
import { requireFeeActor } from "@/lib/mobile/fees";
import { loadSummary } from "@/lib/mobile/fees-report";
import { currentPeriod, isPeriod } from "@/lib/mobile/fees-logic";

export async function GET(req: NextRequest) {
  const g = await requireFeeActor(req, "read");
  if (!g.ok) return g.response;
  const period = req.nextUrl.searchParams.get("period") ?? currentPeriod(new Date());
  if (!isPeriod(period)) return mobileError("INVALID_REQUEST", "Periode tidak valid.", 400);
  return NextResponse.json(await loadSummary(g.actor, period));
}
