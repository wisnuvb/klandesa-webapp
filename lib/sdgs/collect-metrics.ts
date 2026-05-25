import { prisma } from "@/lib/prisma";
import { computePkkStats } from "@/lib/pkk/stats";
import { sumTransactions } from "@/lib/bumdes/api-context";
import type { VillageRawMetrics } from "./types";

function calcAgeYears(birthDate: Date, ref = new Date()): number {
  let age = ref.getFullYear() - birthDate.getFullYear();
  const m = ref.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < birthDate.getDate())) age--;
  return age;
}

function isLowEducation(education: string | null | undefined): boolean {
  if (!education) return true;
  const e = education.toLowerCase();
  return (
    e.includes("tidak") ||
    e.includes("belum") ||
    e === "sd" ||
    e.includes("sd /")
  );
}

function parseDesilNum(desil: string | null | undefined): number | null {
  if (!desil) return null;
  const n = parseInt(String(desil).replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

function parseIdmCode(settings: unknown): string | null {
  if (!settings || typeof settings !== "object") return null;
  const integrations = (settings as Record<string, unknown>).integrations;
  if (!integrations || typeof integrations !== "object") return null;
  const code = (integrations as Record<string, unknown>).idmVillageCode;
  return typeof code === "string" && code.trim() ? code.trim() : null;
}

export async function collectVillageMetrics(villageId: number): Promise<{
  metrics: VillageRawMetrics;
  idmVillageCode: string | null;
}> {
  const now = new Date();
  const year = now.getFullYear();

  const village = await prisma.village.findUnique({
    where: { id: villageId },
    select: { settings: true },
  });

  const [
    residents,
    pkk,
    bumdes,
    cooperative,
    ukmCount,
    agriPotentials,
    socialBeneficiaries,
    socialPrograms,
    citizenReports,
    officials,
    forumCount,
    latestPotential,
    budgets,
  ] = await Promise.all([
    prisma.resident.findMany({
      where: { villageId, isAlive: true },
      select: {
        gender: true,
        birthDate: true,
        education: true,
        occupation: true,
        isIlliterate: true,
        isDisability: true,
        isBpjsKis: true,
        isStunting: true,
        desil: true,
        rt: true,
        rw: true,
      },
    }),
    computePkkStats(villageId),
    prisma.bumdes.findUnique({
      where: { villageId },
      include: { _count: { select: { units: true } } },
    }),
    prisma.cooperative.findUnique({ where: { villageId }, select: { id: true } }),
    prisma.potential.count({
      where: { villageId, status: "active", stockQuantity: { not: null } },
    }),
    prisma.potential.count({
      where: {
        villageId,
        status: "active",
        category: { contains: "Pertanian" },
      },
    }),
    prisma.socialBenefitBeneficiary.count({
      where: {
        program: { villageId },
        status: { in: ["registered", "under_review", "approved", "active"] },
      },
    }),
    prisma.socialBenefitProgram.count({ where: { villageId, isActive: true } }),
    prisma.citizenReport.findMany({
      where: { villageId },
      select: { status: true },
    }),
    prisma.official.findMany({
      where: { villageId, status: "active" },
      select: { gender: true },
    }),
    prisma.forumThread.count({ where: { villageId } }),
    prisma.villagePotential.findFirst({
      where: { villageId },
      orderBy: { year: "desc" },
    }),
    prisma.budget.findMany({
      where: { villageId, year },
      select: { budgetAmount: true, realizedAmount: true },
    }),
  ]);

  let bumdesStats = { unitCount: 0, netProfit: 0, totalIncome: 0 };
  if (bumdes) {
    const tx = await sumTransactions(bumdes.id);
    bumdesStats = {
      unitCount: bumdes._count.units,
      netProfit: tx.netProfit,
      totalIncome: tx.totalIncome,
    };
  }

  let budgetRealizationPct = 0;
  let hasBudgetData = false;
  if (budgets.length > 0) {
    hasBudgetData = true;
    const totalBudget = budgets.reduce((s, b) => s + Number(b.budgetAmount), 0);
    const totalReal = budgets.reduce((s, b) => s + Number(b.realizedAmount), 0);
    budgetRealizationPct = totalBudget > 0 ? (totalReal / totalBudget) * 100 : 0;
  }

  const rtRwMap = new Map<
    string,
    { rt: string; rw: string; population: number; stuntingCount: number; balitaCount: number; desil12Count: number }
  >();

  let femaleCount = 0;
  let illiterateCount = 0;
  let disabilityCount = 0;
  let bpjsCount = 0;
  let desil1Count = 0;
  let desil2Count = 0;
  let lowEducationCount = 0;
  let schoolAgeNoEducation = 0;
  let schoolAgeTotal = 0;
  let femaleAdultWorkers = 0;
  let femaleAdults = 0;

  for (const r of residents) {
    if (r.gender === "Perempuan") femaleCount++;
    if (r.isIlliterate) illiterateCount++;
    if (r.isDisability) disabilityCount++;
    if (r.isBpjsKis) bpjsCount++;

    const desil = parseDesilNum(r.desil);
    if (desil === 1) desil1Count++;
    if (desil === 2) desil2Count++;

    if (isLowEducation(r.education)) lowEducationCount++;

    const age = calcAgeYears(r.birthDate);
    if (age >= 7 && age <= 18) {
      schoolAgeTotal++;
      if (!r.education || isLowEducation(r.education)) schoolAgeNoEducation++;
    }

    if (r.gender === "Perempuan" && age >= 17) {
      femaleAdults++;
      if (r.occupation && r.occupation.trim()) femaleAdultWorkers++;
    }

    const rt = r.rt?.trim() || "-";
    const rw = r.rw?.trim() || "-";
    const key = `${rt}|${rw}`;
    let g = rtRwMap.get(key);
    if (!g) {
      g = { rt, rw, population: 0, stuntingCount: 0, balitaCount: 0, desil12Count: 0 };
      rtRwMap.set(key, g);
    }
    g.population++;
    if (r.isStunting) g.stuntingCount++;
    if (age < 5) g.balitaCount++;
    if (desil === 1 || desil === 2) g.desil12Count++;
  }

  const openReports = citizenReports.filter(
    (c) => c.status !== "DONE" && c.status !== "REJECT",
  ).length;
  const resolvedReports = citizenReports.filter((c) => c.status === "DONE").length;

  const femaleOfficials = officials.filter((o) => o.gender === "Perempuan").length;

  const metrics: VillageRawMetrics = {
    totalResidents: residents.length,
    femaleCount,
    illiterateCount,
    disabilityCount,
    bpjsCount,
    desil1Count,
    desil2Count,
    lowEducationCount,
    schoolAgeNoEducation,
    schoolAgeTotal,
    femaleAdultWorkers,
    femaleAdults,
    pkk,
    bumdes: {
      exists: Boolean(bumdes),
      ...bumdesStats,
    },
    cooperativeExists: Boolean(cooperative),
    ukmProductCount: ukmCount,
    agriculturePotentialCount: agriPotentials,
    socialBenefitBeneficiaries: socialBeneficiaries,
    socialBenefitPrograms: socialPrograms,
    citizenReportsOpen: openReports,
    citizenReportsResolved: resolvedReports,
    officialsCount: officials.length,
    femaleOfficials,
    forumThreads: forumCount,
    villagePotential: latestPotential
      ? {
          healthFacilities: latestPotential.healthFacilities,
          educationFacilities: latestPotential.educationFacilities,
          agricultureLand: latestPotential.agricultureLand,
          forestArea: latestPotential.forestArea,
          waterResources: Boolean(latestPotential.waterResources?.trim()),
        }
      : null,
    finance: { budgetRealizationPct, hasBudgetData },
    rtRwGroups: Array.from(rtRwMap.values()),
  };

  return {
    metrics,
    idmVillageCode: parseIdmCode(village?.settings),
  };
}
