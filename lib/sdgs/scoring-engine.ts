import { SDG_GOALS } from "./goals";
import type { SdgGoalScore, SdgsDashboardPayload, VillageRawMetrics } from "./types";

function clamp(n: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, n));
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return (part / total) * 100;
}

function statusFromScore(score: number | null): SdgGoalScore["status"] {
  if (score == null) return "no_data";
  if (score >= 70) return "good";
  if (score >= 45) return "moderate";
  return "low";
}

function scoreGoal1(m: VillageRawMetrics): SdgGoalScore {
  const total = m.totalResidents;
  const poverty = m.desil1Count + m.desil2Count;
  const povertyRate = pct(poverty, total);
  const bansosBonus = m.socialBenefitBeneficiaries > 0 ? 10 : 0;
  const score =
    total > 0
      ? clamp(100 - povertyRate * 1.2 + bansosBonus + (m.socialBenefitPrograms > 0 ? 5 : 0))
      : null;

  return {
    goalId: 1,
    slug: SDG_GOALS[0].slug,
    title: SDG_GOALS[0].title,
    shortTitle: SDG_GOALS[0].shortTitle,
    score,
    status: statusFromScore(score),
    indicators: [
      { label: "Warga desil 1–2", value: String(poverty), impact: poverty > 0 ? "negative" : "positive" },
      { label: "Penerima bansos aktif", value: String(m.socialBenefitBeneficiaries), impact: "positive" },
    ],
    dataSources: ["residents", "social_benefits"],
  };
}

function scoreGoal2(m: VillageRawMetrics): SdgGoalScore {
  let score = 40;
  if (m.agriculturePotentialCount > 0) score += 20;
  if (m.bumdes.exists && m.bumdes.unitCount > 0) score += 20;
  if (m.villagePotential && m.villagePotential.agricultureLand > 0) score += 20;
  score = clamp(score);

  return {
    goalId: 2,
    slug: SDG_GOALS[1].slug,
    title: SDG_GOALS[1].title,
    shortTitle: SDG_GOALS[1].shortTitle,
    score,
    status: statusFromScore(score),
    indicators: [
      { label: "Potensi pertanian", value: String(m.agriculturePotentialCount), impact: "positive" },
      { label: "Unit BUMDes", value: String(m.bumdes.unitCount), impact: "positive" },
    ],
    dataSources: ["potentials", "bumdes", "village_potential"],
  };
}

function scoreGoal3(m: VillageRawMetrics): SdgGoalScore {
  const { pkk } = m;
  const stuntingRate = pct(pkk.balitaStunting, Math.max(pkk.balita, 1));
  let score = clamp(100 - stuntingRate * 1.5);
  if (pkk.posyanduSessionsThisMonth > 0) score = clamp(score + 10);
  if (pkk.dasawismaCount > 0) score = clamp(score + 5);

  return {
    goalId: 3,
    slug: SDG_GOALS[2].slug,
    title: SDG_GOALS[2].title,
    shortTitle: SDG_GOALS[2].shortTitle,
    score,
    status: statusFromScore(score),
    indicators: [
      { label: "Balita stunting", value: String(pkk.balitaStunting), impact: "negative" },
      { label: "Sesi posyandu (bulan ini)", value: String(pkk.posyanduSessionsThisMonth), impact: "positive" },
      { label: "Ibu hamil terdata", value: String(pkk.ibuHamil), impact: "neutral" },
    ],
    dataSources: ["pkk", "residents"],
  };
}

function scoreGoal4(m: VillageRawMetrics): SdgGoalScore {
  const illiteracyRate = pct(m.illiterateCount, Math.max(m.totalResidents, 1));
  const atsRate = pct(m.schoolAgeNoEducation, Math.max(m.schoolAgeTotal, 1));
  const eduFacilities = m.villagePotential?.educationFacilities ?? 0;
  let score = clamp(100 - illiteracyRate - atsRate * 0.8 + (eduFacilities > 0 ? 10 : 0));

  return {
    goalId: 4,
    slug: SDG_GOALS[3].slug,
    title: SDG_GOALS[3].title,
    shortTitle: SDG_GOALS[3].shortTitle,
    score,
    status: statusFromScore(score),
    indicators: [
      { label: "Buta huruf", value: String(m.illiterateCount), impact: "negative" },
      { label: "Usia sekolah tanpa pendidikan memadai", value: String(m.schoolAgeNoEducation), impact: "negative" },
    ],
    dataSources: ["residents", "village_potential"],
  };
}

function scoreGoal5(m: VillageRawMetrics): SdgGoalScore {
  const femaleParticipation = pct(m.femaleAdultWorkers, Math.max(m.femaleAdults, 1));
  const femaleOfficialRate = pct(m.femaleOfficials, Math.max(m.officialsCount, 1));
  const score = clamp(femaleParticipation * 0.5 + femaleOfficialRate * 0.5 + (m.pkk.dasawismaCount > 0 ? 15 : 0));

  return {
    goalId: 5,
    slug: SDG_GOALS[4].slug,
    title: SDG_GOALS[4].title,
    shortTitle: SDG_GOALS[4].shortTitle,
    score,
    status: statusFromScore(score),
    indicators: [
      { label: "Perempuan pekerja (dewasa)", value: `${femaleParticipation.toFixed(0)}%`, impact: "positive" },
      { label: "Perempuan perangkat desa", value: String(m.femaleOfficials), impact: "positive" },
    ],
    dataSources: ["residents", "officials", "pkk"],
  };
}

function scoreFromFacilities(
  m: VillageRawMetrics,
  goalId: number,
  idx: number,
  check: (vp: NonNullable<VillageRawMetrics["villagePotential"]>) => number | boolean,
  label: string,
): SdgGoalScore {
  const vp = m.villagePotential;
  let score: number | null = null;
  let value = "Belum ada data";
  if (vp) {
    const raw = check(vp);
    if (typeof raw === "boolean") {
      score = raw ? 75 : 35;
      value = raw ? "Tersedia" : "Belum terdata";
    } else {
      score = clamp(Math.min(100, raw * 15 + 25));
      value = String(raw);
    }
  }

  return {
    goalId,
    slug: SDG_GOALS[idx].slug,
    title: SDG_GOALS[idx].title,
    shortTitle: SDG_GOALS[idx].shortTitle,
    score,
    status: statusFromScore(score),
    indicators: [{ label, value, impact: "neutral" }],
    dataSources: ["village_potential"],
  };
}

function scoreGoal8(m: VillageRawMetrics): SdgGoalScore {
  let score = 30;
  if (m.bumdes.exists) score += 25;
  if (m.bumdes.netProfit > 0) score += 15;
  if (m.cooperativeExists) score += 15;
  if (m.ukmProductCount > 0) score += 15;
  score = clamp(score);

  return {
    goalId: 8,
    slug: SDG_GOALS[7].slug,
    title: SDG_GOALS[7].title,
    shortTitle: SDG_GOALS[7].shortTitle,
    score,
    status: statusFromScore(score),
    indicators: [
      { label: "BUMDes aktif", value: m.bumdes.exists ? "Ya" : "Belum", impact: m.bumdes.exists ? "positive" : "negative" },
      { label: "Laba BUMDes", value: m.bumdes.netProfit.toLocaleString("id-ID"), impact: m.bumdes.netProfit > 0 ? "positive" : "neutral" },
      { label: "Produk UKM", value: String(m.ukmProductCount), impact: "positive" },
    ],
    dataSources: ["bumdes", "cooperative", "ukm"],
  };
}

function scoreGoal10(m: VillageRawMetrics): SdgGoalScore {
  const disabilitySupport = pct(m.bpjsCount, Math.max(m.totalResidents, 1));
  const inequality = pct(m.desil1Count, Math.max(m.totalResidents, 1));
  const score = clamp(disabilitySupport * 0.4 + (100 - inequality) * 0.6);

  return {
    goalId: 10,
    slug: SDG_GOALS[9].slug,
    title: SDG_GOALS[9].title,
    shortTitle: SDG_GOALS[9].shortTitle,
    score,
    status: statusFromScore(score),
    indicators: [
      { label: "Peserta BPJS KIS", value: String(m.bpjsCount), impact: "positive" },
      { label: "Disabilitas terdata", value: String(m.disabilityCount), impact: "neutral" },
    ],
    dataSources: ["residents"],
  };
}

function scoreGoal16(m: VillageRawMetrics): SdgGoalScore {
  const total = m.citizenReportsOpen + m.citizenReportsResolved;
  const resolveRate = pct(m.citizenReportsResolved, Math.max(total, 1));
  let score = clamp(resolveRate * 0.6 + (m.officialsCount > 0 ? 20 : 0) + (m.forumThreads > 0 ? 10 : 0));
  if (total === 0 && m.officialsCount > 0) score = 65;

  return {
    goalId: 16,
    slug: SDG_GOALS[15].slug,
    title: SDG_GOALS[15].title,
    shortTitle: SDG_GOALS[15].shortTitle,
    score,
    status: statusFromScore(score),
    indicators: [
      { label: "Aduan selesai", value: String(m.citizenReportsResolved), impact: "positive" },
      { label: "Aduan terbuka", value: String(m.citizenReportsOpen), impact: "negative" },
    ],
    dataSources: ["citizen_reports", "officials", "forum"],
  };
}

function scoreGoal17(m: VillageRawMetrics): SdgGoalScore {
  let score = 40;
  if (m.finance.hasBudgetData) score += 25;
  if (m.socialBenefitPrograms > 0) score += 15;
  if (m.bumdes.exists || m.cooperativeExists) score += 20;
  score = clamp(score);

  return {
    goalId: 17,
    slug: SDG_GOALS[16].slug,
    title: SDG_GOALS[16].title,
    shortTitle: SDG_GOALS[16].shortTitle,
    score,
    status: statusFromScore(score),
    indicators: [
      { label: "Realisasi anggaran", value: m.finance.hasBudgetData ? `${m.finance.budgetRealizationPct.toFixed(0)}%` : "—", impact: "positive" },
    ],
    dataSources: ["finance", "social_benefits", "bumdes"],
  };
}

function scoreGoal18(m: VillageRawMetrics): SdgGoalScore {
  const score = clamp(
    (m.officialsCount > 0 ? 40 : 10) +
      (m.pkk.dasawismaCount > 0 ? 30 : 0) +
      (m.forumThreads > 0 ? 15 : 0) +
      (m.femaleOfficials > 0 ? 15 : 0),
  );

  return {
    goalId: 18,
    slug: SDG_GOALS[17].slug,
    title: SDG_GOALS[17].title,
    shortTitle: SDG_GOALS[17].shortTitle,
    score,
    status: statusFromScore(score),
    indicators: [
      { label: "Perangkat desa", value: String(m.officialsCount), impact: "positive" },
      { label: "Dasawisma", value: String(m.pkk.dasawismaCount), impact: "positive" },
    ],
    dataSources: ["officials", "pkk", "forum"],
  };
}

function buildHeatmap(m: VillageRawMetrics) {
  return m.rtRwGroups
    .map((g) => {
      const healthScore =
        g.balitaCount > 0
          ? clamp(100 - pct(g.stuntingCount, g.balitaCount) * 1.5)
          : null;
      const povertyScore =
        g.population > 0 ? clamp(100 - pct(g.desil12Count, g.population) * 1.2) : null;
      const parts = [healthScore, povertyScore].filter((x): x is number => x != null);
      const compositeScore =
        parts.length > 0 ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : null;

      return {
        rt: g.rt,
        rw: g.rw,
        label: `RT ${g.rt} / RW ${g.rw}`,
        population: g.population,
        healthScore: healthScore != null ? Math.round(healthScore) : null,
        povertyScore: povertyScore != null ? Math.round(povertyScore) : null,
        compositeScore,
      };
    })
    .sort((a, b) => (a.compositeScore ?? 0) - (b.compositeScore ?? 0));
}

export function computeSdgsDashboard(
  metrics: VillageRawMetrics,
  idmVillageCode: string | null,
): SdgsDashboardPayload {
  const goals: SdgGoalScore[] = [
    scoreGoal1(metrics),
    scoreGoal2(metrics),
    scoreGoal3(metrics),
    scoreGoal4(metrics),
    scoreGoal5(metrics),
    scoreFromFacilities(metrics, 6, 5, (vp) => vp.waterResources, "Sumber air terdata"),
    scoreFromFacilities(metrics, 7, 6, () => false, "Energi terbarukan"),
    scoreGoal8(metrics),
    scoreFromFacilities(metrics, 9, 8, (vp) => vp.educationFacilities + vp.healthFacilities, "Fasilitas desa"),
    scoreGoal10(metrics),
    scoreFromFacilities(metrics, 11, 10, (vp) => vp.healthFacilities > 0, "Fasilitas kesehatan"),
    scoreFromFacilities(metrics, 12, 11, (vp) => vp.agricultureLand > 0, "Lahan produktif"),
    scoreFromFacilities(metrics, 13, 12, () => false, "Adaptasi iklim"),
    scoreFromFacilities(metrics, 14, 13, () => false, "Ekosistem pesisir"),
    scoreFromFacilities(metrics, 15, 14, (vp) => vp.forestArea, "Luas hutan desa (ha)"),
    scoreGoal16(metrics),
    scoreGoal17(metrics),
    scoreGoal18(metrics),
  ];

  const scored = goals.filter((g) => g.score != null);
  const overallScore =
    scored.length > 0
      ? Math.round(scored.reduce((s, g) => s + (g.score ?? 0), 0) / scored.length)
      : null;

  const goalsOnTrack = goals.filter((g) => g.status === "good").length;
  const goalsNeedAttention = goals.filter((g) => g.status === "low").length;

  return {
    computedAt: new Date().toISOString(),
    year: new Date().getFullYear(),
    overallScore,
    goalsOnTrack,
    goalsNeedAttention,
    goals,
    heatmap: buildHeatmap(metrics),
    moduleCoverage: {
      residents: metrics.totalResidents > 0,
      pkk: metrics.pkk.dasawismaCount > 0 || metrics.pkk.posyanduSessionsThisMonth > 0,
      bumdes: metrics.bumdes.exists,
      finance: metrics.finance.hasBudgetData,
      socialBenefits: metrics.socialBenefitPrograms > 0,
    },
    kemendesaUrl: "https://dashboard-sdgs.kemendesa.go.id/",
    idmVillageCode,
  };
}
