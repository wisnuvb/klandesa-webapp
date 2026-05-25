export type VillageRawMetrics = {
  totalResidents: number;
  femaleCount: number;
  illiterateCount: number;
  disabilityCount: number;
  bpjsCount: number;
  desil1Count: number;
  desil2Count: number;
  lowEducationCount: number;
  /** usia 7-18 tanpa pendidikan dasar */
  schoolAgeNoEducation: number;
  schoolAgeTotal: number;
  /** Perempuan pekerja / warga dewasa perempuan */
  femaleAdultWorkers: number;
  femaleAdults: number;
  pkk: {
    balitaStunting: number;
    ibuHamil: number;
    balita: number;
    dasawismaCount: number;
    posyanduSessionsThisMonth: number;
  };
  bumdes: {
    exists: boolean;
    unitCount: number;
    netProfit: number;
    totalIncome: number;
  };
  cooperativeExists: boolean;
  ukmProductCount: number;
  agriculturePotentialCount: number;
  socialBenefitBeneficiaries: number;
  socialBenefitPrograms: number;
  citizenReportsOpen: number;
  citizenReportsResolved: number;
  officialsCount: number;
  femaleOfficials: number;
  forumThreads: number;
  villagePotential: {
    healthFacilities: number;
    educationFacilities: number;
    agricultureLand: number;
    forestArea: number;
    waterResources: boolean;
  } | null;
  finance: {
    budgetRealizationPct: number;
    hasBudgetData: boolean;
  };
  rtRwGroups: Array<{
    rt: string;
    rw: string;
    population: number;
    stuntingCount: number;
    balitaCount: number;
    desil12Count: number;
  }>;
};

export type SdgGoalScore = {
  goalId: number;
  slug: string;
  title: string;
  shortTitle: string;
  score: number | null;
  status: "good" | "moderate" | "low" | "no_data";
  indicators: Array<{ label: string; value: string; impact: "positive" | "negative" | "neutral" }>;
  dataSources: string[];
};

export type SdgsDashboardPayload = {
  computedAt: string;
  year: number;
  overallScore: number | null;
  goalsOnTrack: number;
  goalsNeedAttention: number;
  goals: SdgGoalScore[];
  heatmap: Array<{
    rt: string;
    rw: string;
    label: string;
    population: number;
    healthScore: number | null;
    povertyScore: number | null;
    compositeScore: number | null;
  }>;
  moduleCoverage: {
    residents: boolean;
    pkk: boolean;
    bumdes: boolean;
    finance: boolean;
    socialBenefits: boolean;
  };
  kemendesaUrl: string;
  idmVillageCode: string | null;
};
