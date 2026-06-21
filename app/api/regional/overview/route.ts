import { NextRequest, NextResponse } from "next/server";
import {
  aggregateRegionalAlerts,
  aggregateRegionalDemographics,
  aggregateRegionalFinance,
  aggregateRegionalAdoption,
  aggregateRegionalSdgs,
  computeDigitalVillageIndex,
} from "@/lib/regional-aggregate";
import { requireRegionalApi } from "@/lib/regional-api-handler";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const loaded = await requireRegionalApi(req, "regional_overview_get");
  if (!loaded.ok) return loaded.response;
  const { regional, villageIds, villages } = loaded.ctx;
  const year = new Date().getFullYear();

  const [demographics, sdgs, adoption, finance] = await Promise.all([
    aggregateRegionalDemographics(regional.scope, villageIds),
    aggregateRegionalSdgs(regional.scope, villageIds, villages),
    aggregateRegionalAdoption(regional.scope, villageIds, villages),
    aggregateRegionalFinance(regional.scope, villageIds, villages, year),
  ]);

  const subscriptionPct =
    adoption.totalVillages > 0
      ? (adoption.subscribedVillages / adoption.totalVillages) * 100
      : 0;
  const syncPct =
    villageIds.length > 0
      ? (adoption.syncStatus.villagesWithAnySync / villageIds.length) * 100
      : 0;
  const moduleAdoptionAvg =
    adoption.moduleAdoption.length > 0
      ? adoption.moduleAdoption.reduce((s, m) => s + m.pct, 0) /
        adoption.moduleAdoption.length
      : 0;

  const digitalIndex = computeDigitalVillageIndex({
    subscriptionPct,
    syncPct,
    avgSdgsScore: sdgs.overallScore,
    financeRealizationPct: finance.totals.realizationPct,
    moduleAdoptionAvg,
  });

  const alerts = await aggregateRegionalAlerts(
    villageIds,
    villages,
    finance.byVillage,
    demographics.stuntingRate,
  );

  return NextResponse.json({
    scope: regional.scope,
    digitalIndex,
    demographics: {
      totalResidents: demographics.totalResidents,
      stuntingRate: demographics.stuntingRate,
      desil12Rate: demographics.desil12Rate,
    },
    sdgs: {
      overallScore: sdgs.overallScore,
      villagesScored: sdgs.villagesScored,
    },
    adoption: {
      totalVillages: adoption.totalVillages,
      subscribedVillages: adoption.subscribedVillages,
      includedInAggregate: adoption.includedInAggregate,
    },
    finance: finance.totals,
    alerts,
  });
}
