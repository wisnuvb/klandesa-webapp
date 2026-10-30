import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeSdgsDashboard } from "../lib/sdgs/scoring-engine.ts";
import type { VillageRawMetrics } from "../lib/sdgs/types.ts";

const base: VillageRawMetrics = {
  totalResidents: 1000,
  femaleCount: 500,
  illiterateCount: 0,
  disabilityCount: 0,
  bpjsCount: 700,
  desil1Count: 10,
  desil2Count: 20,
  lowEducationCount: 0,
  schoolAgeNoEducation: 3,
  schoolAgeTotal: 19,
  femaleAdultWorkers: 100,
  femaleAdults: 300,
  pkk: { balitaStunting: 1, ibuHamil: 2, balita: 30, dasawismaCount: 2, posyanduSessionsThisMonth: 1 },
  bumdes: { exists: true, unitCount: 1, netProfit: 0, totalIncome: 0 },
  cooperativeExists: false,
  ukmProductCount: 0,
  agriculturePotentialCount: 0,
  socialBenefitBeneficiaries: 0,
  socialBenefitPrograms: 0,
  citizenReportsOpen: 0,
  citizenReportsResolved: 0,
  officialsCount: 5,
  femaleOfficials: 1,
  forumThreads: 0,
  villagePotential: {
    healthFacilities: 1,
    educationFacilities: 1,
    agricultureLand: 0,
    forestArea: 0,
    waterResources: true,
  },
  finance: { budgetRealizationPct: 50, hasBudgetData: true },
  rtRwGroups: [],
};

describe("computeSdgsDashboard", () => {
  it("membulatkan skor goal menjadi bilangan bulat", () => {
    // 3/19 usia sekolah tanpa pendidikan memadai -> skor mentah berekor panjang
    const { goals } = computeSdgsDashboard(base, null);
    for (const g of goals) {
      if (g.score != null) assert.equal(g.score, Math.round(g.score));
    }
  });

  it("goal tanpa sumber data (7, 13, 14) berstatus no_data, bukan skor palsu", () => {
    const { goals } = computeSdgsDashboard(base, null);
    for (const id of [7, 13, 14]) {
      const g = goals.find((x) => x.goalId === id)!;
      assert.equal(g.score, null);
      assert.equal(g.status, "no_data");
    }
  });

  it("desa tanpa warga tidak mendapat skor 'Baik' dari data kosong", () => {
    const { goals } = computeSdgsDashboard(
      { ...base, totalResidents: 0, schoolAgeTotal: 0, schoolAgeNoEducation: 0, pkk: { ...base.pkk, balita: 0, dasawismaCount: 0, posyanduSessionsThisMonth: 0, balitaStunting: 0 } },
      null,
    );
    for (const id of [3, 4, 5, 10]) {
      assert.equal(goals.find((x) => x.goalId === id)!.score, null, `goal ${id}`);
    }
  });

  it("heatmap: RT/RW tanpa skor diurutkan terakhir dan diberi label jelas", () => {
    const { heatmap } = computeSdgsDashboard(
      {
        ...base,
        rtRwGroups: [
          { rt: "-", rw: "-", population: 5, stuntingCount: 0, balitaCount: 0, desil12Count: 0 },
          { rt: "1", rw: "2", population: 10, stuntingCount: 0, balitaCount: 2, desil12Count: 5 },
        ],
      },
      null,
    );
    assert.equal(heatmap[0].label, "RT 1 / RW 2");
    assert.equal(heatmap[1].label, "Tanpa RT/RW");
  });
});
