import { prisma } from "@/lib/prisma";
import { getAgeRange } from "@/lib/statistics/age-range";
import { collectVillageMetrics } from "@/lib/sdgs/collect-metrics";
import { computeSdgsDashboard } from "@/lib/sdgs/scoring-engine";
import { parseWilayahSettings } from "@/lib/village/wilayah-settings";
import type { RegionalScope } from "@/lib/regional-session";
import type { VillageInScope } from "@/lib/regional-scope";

function calcAgeYears(birthDate: Date, ref = new Date()): number {
  let age = ref.getFullYear() - birthDate.getFullYear();
  const m = ref.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < birthDate.getDate())) age--;
  return age;
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    worker(),
  );
  await Promise.all(workers);
  return results;
}

export type RegionalDemographicsPayload = {
  scope: RegionalScope;
  villagesIncluded: number;
  totalResidents: number;
  gender: { male: number; female: number };
  agePyramid: Array<{
    range: string;
    male: number;
    female: number;
    total: number;
  }>;
  welfare: {
    desil1: number;
    desil2: number;
    illiterate: number;
    disability: number;
    bpjsKis: number;
    stunting: number;
    pregnant: number;
  };
  stuntingRate: number | null;
  desil12Rate: number | null;
};

export async function aggregateRegionalDemographics(
  scope: RegionalScope,
  villageIds: number[],
): Promise<RegionalDemographicsPayload> {
  if (villageIds.length === 0) {
    return {
      scope,
      villagesIncluded: 0,
      totalResidents: 0,
      gender: { male: 0, female: 0 },
      agePyramid: [],
      welfare: {
        desil1: 0,
        desil2: 0,
        illiterate: 0,
        disability: 0,
        bpjsKis: 0,
        stunting: 0,
        pregnant: 0,
      },
      stuntingRate: null,
      desil12Rate: null,
    };
  }

  const residents = await prisma.resident.findMany({
    where: { villageId: { in: villageIds }, isAlive: true },
    select: {
      gender: true,
      birthDate: true,
      desil: true,
      isIlliterate: true,
      isDisability: true,
      isBpjsKis: true,
      isStunting: true,
      isPregnant: true,
    },
  });

  const ageMap = new Map<string, { male: number; female: number }>();
  let male = 0;
  let female = 0;
  let desil1 = 0;
  let desil2 = 0;
  let illiterate = 0;
  let disability = 0;
  let bpjsKis = 0;
  let stunting = 0;
  let pregnant = 0;

  for (const r of residents) {
    if (r.gender === "Laki-laki") male++;
    else if (r.gender === "Perempuan") female++;

    const age = calcAgeYears(r.birthDate);
    const range = getAgeRange(age);
    const bucket = ageMap.get(range) ?? { male: 0, female: 0 };
    if (r.gender === "Laki-laki") bucket.male++;
    else bucket.female++;
    ageMap.set(range, bucket);

    const desilNum = parseInt(String(r.desil ?? "").replace(/\D/g, ""), 10);
    if (desilNum === 1) desil1++;
    if (desilNum === 2) desil2++;
    if (r.isIlliterate) illiterate++;
    if (r.isDisability) disability++;
    if (r.isBpjsKis) bpjsKis++;
    if (r.isStunting) stunting++;
    if (r.isPregnant) pregnant++;
  }

  const order = [
    "0-4",
    "5-9",
    "10-14",
    "15-19",
    "20-24",
    "25-29",
    "30-34",
    "35-39",
    "40-44",
    "45-49",
    "50-54",
    "55-59",
    "60+",
  ];
  const agePyramid = order.map((range) => {
    const b = ageMap.get(range) ?? { male: 0, female: 0 };
    return {
      range,
      male: b.male,
      female: b.female,
      total: b.male + b.female,
    };
  });

  const total = residents.length;
  return {
    scope,
    villagesIncluded: villageIds.length,
    totalResidents: total,
    gender: { male, female },
    agePyramid,
    welfare: {
      desil1,
      desil2,
      illiterate,
      disability,
      bpjsKis,
      stunting,
      pregnant,
    },
    stuntingRate: total > 0 ? Math.round((stunting / total) * 1000) / 10 : null,
    desil12Rate:
      total > 0
        ? Math.round(((desil1 + desil2) / total) * 1000) / 10
        : null,
  };
}

export type RegionalSdgsPayload = {
  scope: RegionalScope;
  villagesIncluded: number;
  villagesScored: number;
  overallScore: number | null;
  goals: Array<{
    goalId: number;
    shortTitle: string;
    avgScore: number | null;
    villagesLow: number;
    villagesGood: number;
  }>;
  ranking: Array<{
    villageId: number;
    code: string;
    name: string;
    district: string;
    overallScore: number | null;
  }>;
  byDistrict: Array<{
    district: string;
    villageCount: number;
    avgOverallScore: number | null;
  }>;
};

export async function aggregateRegionalSdgs(
  scope: RegionalScope,
  villageIds: number[],
  villages: VillageInScope[],
): Promise<RegionalSdgsPayload> {
  if (villageIds.length === 0) {
    return {
      scope,
      villagesIncluded: 0,
      villagesScored: 0,
      overallScore: null,
      goals: [],
      ranking: [],
      byDistrict: [],
    };
  }

  const villageMeta = new Map(villages.map((v) => [v.id, v]));
  const dashboards = await mapWithConcurrency(villageIds, 5, async (id) => {
    const { metrics, idmVillageCode } = await collectVillageMetrics(id);
    const dash = computeSdgsDashboard(metrics, idmVillageCode);
    return { villageId: id, dash };
  });

  const goalAgg = new Map<
    number,
    { shortTitle: string; scores: number[]; low: number; good: number }
  >();

  const ranking: RegionalSdgsPayload["ranking"] = [];
  let overallSum = 0;
  let overallCount = 0;

  for (const { villageId, dash } of dashboards) {
    const meta = villageMeta.get(villageId);
    if (dash.overallScore != null) {
      overallSum += dash.overallScore;
      overallCount++;
    }
    ranking.push({
      villageId,
      code: meta?.code ?? "",
      name: meta?.name ?? "",
      district: meta?.district ?? "",
      overallScore: dash.overallScore,
    });

    for (const g of dash.goals) {
      let entry = goalAgg.get(g.goalId);
      if (!entry) {
        entry = { shortTitle: g.shortTitle, scores: [], low: 0, good: 0 };
        goalAgg.set(g.goalId, entry);
      }
      if (g.score != null) entry.scores.push(g.score);
      if (g.status === "low") entry.low++;
      if (g.status === "good") entry.good++;
    }
  }

  ranking.sort((a, b) => (b.overallScore ?? -1) - (a.overallScore ?? -1));

  const goals = Array.from(goalAgg.entries())
    .sort(([a], [b]) => a - b)
    .map(([goalId, g]) => ({
      goalId,
      shortTitle: g.shortTitle,
      avgScore:
        g.scores.length > 0
          ? Math.round(g.scores.reduce((s, x) => s + x, 0) / g.scores.length)
          : null,
      villagesLow: g.low,
      villagesGood: g.good,
    }));

  const districtMap = new Map<
    string,
    { scores: number[]; count: number }
  >();
  for (const r of ranking) {
    const d = r.district || "—";
    const entry = districtMap.get(d) ?? { scores: [], count: 0 };
    entry.count++;
    if (r.overallScore != null) entry.scores.push(r.overallScore);
    districtMap.set(d, entry);
  }

  const byDistrict = Array.from(districtMap.entries())
    .map(([district, d]) => ({
      district,
      villageCount: d.count,
      avgOverallScore:
        d.scores.length > 0
          ? Math.round(d.scores.reduce((s, x) => s + x, 0) / d.scores.length)
          : null,
    }))
    .sort((a, b) => a.district.localeCompare(b.district, "id"));

  return {
    scope,
    villagesIncluded: villageIds.length,
    villagesScored: overallCount,
    overallScore:
      overallCount > 0 ? Math.round(overallSum / overallCount) : null,
    goals,
    ranking: ranking.slice(0, 50),
    byDistrict,
  };
}

export type RegionalAdoptionPayload = {
  scope: RegionalScope;
  totalVillages: number;
  activeVillages: number;
  subscribedVillages: number;
  includedInAggregate: number;
  moduleAdoption: Array<{
    module: string;
    label: string;
    villagesWithData: number;
    pct: number;
  }>;
  syncStatus: {
    villagesWithAnySync: number;
    byAdapter: Array<{ adapterId: string; villageCount: number }>;
  };
  villages: Array<{
    id: number;
    code: string;
    name: string;
    district: string;
    subscriptionActive: boolean;
    lastSyncAt: string | null;
    modulesUsed: number;
  }>;
};

export async function aggregateRegionalAdoption(
  scope: RegionalScope,
  villageIds: number[],
  villages: VillageInScope[],
): Promise<RegionalAdoptionPayload> {
  const activeVillages = villages.filter((v) => v.isActive).length;
  const subscribedVillages = villages.filter((v) => v.subscriptionActive).length;

  if (villageIds.length === 0) {
    return {
      scope,
      totalVillages: villages.length,
      activeVillages,
      subscribedVillages,
      includedInAggregate: 0,
      moduleAdoption: [],
      syncStatus: { villagesWithAnySync: 0, byAdapter: [] },
      villages: villages.map((v) => ({
        id: v.id,
        code: v.code,
        name: v.name,
        district: v.district,
        subscriptionActive: v.subscriptionActive,
        lastSyncAt: null,
        modulesUsed: 0,
      })),
    };
  }

  const [
    residentCounts,
    budgetCounts,
    mailCounts,
    bumdesCounts,
    coopCounts,
    pkkCounts,
    rpjmCounts,
    gisCounts,
    syncLogs,
  ] = await Promise.all([
    prisma.resident.groupBy({
      by: ["villageId"],
      where: { villageId: { in: villageIds } },
      _count: { id: true },
    }),
    prisma.budget.groupBy({
      by: ["villageId"],
      where: { villageId: { in: villageIds } },
      _count: { id: true },
    }),
    prisma.mailService.groupBy({
      by: ["villageId"],
      where: { villageId: { in: villageIds } },
      _count: { id: true },
    }),
    prisma.bumdes.findMany({
      where: { villageId: { in: villageIds } },
      select: { villageId: true },
    }),
    prisma.cooperative.findMany({
      where: { villageId: { in: villageIds } },
      select: { villageId: true },
    }),
    prisma.dasawisma.groupBy({
      by: ["villageId"],
      where: { villageId: { in: villageIds } },
      _count: { id: true },
    }),
    prisma.rpjmdesPlan.groupBy({
      by: ["villageId"],
      where: { villageId: { in: villageIds } },
      _count: { id: true },
    }),
    prisma.villageAsset.groupBy({
      by: ["villageId"],
      where: { villageId: { in: villageIds } },
      _count: { id: true },
    }),
    prisma.integrationSyncLog.findMany({
      where: { villageId: { in: villageIds }, status: "success" },
      select: { villageId: true, adapterId: true, finishedAt: true, startedAt: true },
      orderBy: { startedAt: "desc" },
    }),
  ]);

  const hasResidents = new Set(residentCounts.map((r) => r.villageId));
  const hasBudget = new Set(budgetCounts.map((r) => r.villageId));
  const hasMail = new Set(mailCounts.map((r) => r.villageId));
  const hasBumdes = new Set(bumdesCounts.map((r) => r.villageId));
  const hasCoop = new Set(coopCounts.map((r) => r.villageId));
  const hasPkk = new Set(pkkCounts.map((r) => r.villageId));
  const hasRpjm = new Set(rpjmCounts.map((r) => r.villageId));
  const hasGis = new Set(gisCounts.map((r) => r.villageId));

  const pct = (n: number) =>
    villageIds.length > 0 ? Math.round((n / villageIds.length) * 1000) / 10 : 0;

  const moduleAdoption = [
    { module: "residents", label: "Data warga", villagesWithData: hasResidents.size, pct: pct(hasResidents.size) },
    { module: "finance", label: "Anggaran/APBDes", villagesWithData: hasBudget.size, pct: pct(hasBudget.size) },
    { module: "mail", label: "Layanan surat", villagesWithData: hasMail.size, pct: pct(hasMail.size) },
    { module: "bumdes", label: "BUMDes", villagesWithData: hasBumdes.size, pct: pct(hasBumdes.size) },
    { module: "cooperative", label: "Koperasi", villagesWithData: hasCoop.size, pct: pct(hasCoop.size) },
    { module: "pkk", label: "PKK / Posyandu", villagesWithData: hasPkk.size, pct: pct(hasPkk.size) },
    { module: "rpjmdes", label: "RPJMDes", villagesWithData: hasRpjm.size, pct: pct(hasRpjm.size) },
    { module: "gis", label: "Peta infrastruktur", villagesWithData: hasGis.size, pct: pct(hasGis.size) },
  ];

  const lastSyncByVillage = new Map<number, Date>();
  const adapterVillages = new Map<string, Set<number>>();
  for (const log of syncLogs) {
    const at = log.finishedAt ?? log.startedAt;
    const prev = lastSyncByVillage.get(log.villageId);
    if (!prev || at > prev) lastSyncByVillage.set(log.villageId, at);
    let set = adapterVillages.get(log.adapterId);
    if (!set) {
      set = new Set();
      adapterVillages.set(log.adapterId, set);
    }
    set.add(log.villageId);
  }

  const villageList = villages.map((v) => {
    let modulesUsed = 0;
    if (hasResidents.has(v.id)) modulesUsed++;
    if (hasBudget.has(v.id)) modulesUsed++;
    if (hasMail.has(v.id)) modulesUsed++;
    if (hasBumdes.has(v.id)) modulesUsed++;
    if (hasCoop.has(v.id)) modulesUsed++;
    if (hasPkk.has(v.id)) modulesUsed++;
    if (hasRpjm.has(v.id)) modulesUsed++;
    if (hasGis.has(v.id)) modulesUsed++;
    const lastSync = lastSyncByVillage.get(v.id);
    return {
      id: v.id,
      code: v.code,
      name: v.name,
      district: v.district,
      subscriptionActive: v.subscriptionActive,
      lastSyncAt: lastSync?.toISOString() ?? null,
      modulesUsed,
    };
  });

  return {
    scope,
    totalVillages: villages.length,
    activeVillages,
    subscribedVillages,
    includedInAggregate: villageIds.length,
    moduleAdoption,
    syncStatus: {
      villagesWithAnySync: lastSyncByVillage.size,
      byAdapter: Array.from(adapterVillages.entries()).map(
        ([adapterId, set]) => ({
          adapterId,
          villageCount: set.size,
        }),
      ),
    },
    villages: villageList,
  };
}

export type RegionalFinancePayload = {
  scope: RegionalScope;
  villagesIncluded: number;
  year: number;
  totals: {
    budgetAmount: number;
    realizedAmount: number;
    realizationPct: number;
  };
  byCategory: Array<{ category: string; budget: number; realized: number }>;
  byVillage: Array<{
    villageId: number;
    code: string;
    name: string;
    district: string;
    budget: number;
    realized: number;
    realizationPct: number;
  }>;
  monthlyTrend: Array<{ month: string; income: number; expense: number }>;
};

export async function aggregateRegionalFinance(
  scope: RegionalScope,
  villageIds: number[],
  villages: VillageInScope[],
  year: number,
): Promise<RegionalFinancePayload> {
  const empty: RegionalFinancePayload = {
    scope,
    villagesIncluded: villageIds.length,
    year,
    totals: { budgetAmount: 0, realizedAmount: 0, realizationPct: 0 },
    byCategory: [],
    byVillage: [],
    monthlyTrend: [],
  };
  if (villageIds.length === 0) return empty;

  const [budgets, transactions] = await Promise.all([
    prisma.budget.findMany({
      where: { villageId: { in: villageIds }, year },
      select: {
        villageId: true,
        category: true,
        budgetAmount: true,
        realizedAmount: true,
      },
    }),
    prisma.transaction.findMany({
      where: {
        villageId: { in: villageIds },
        transactionDate: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`),
        },
      },
      select: {
        type: true,
        amount: true,
        transactionDate: true,
      },
    }),
  ]);

  let budgetAmount = 0;
  let realizedAmount = 0;
  const catMap = new Map<string, { budget: number; realized: number }>();
  const villMap = new Map<number, { budget: number; realized: number }>();

  for (const b of budgets) {
    const bud = Number(b.budgetAmount);
    const real = Number(b.realizedAmount);
    budgetAmount += bud;
    realizedAmount += real;

    const cat = b.category || "Lainnya";
    const c = catMap.get(cat) ?? { budget: 0, realized: 0 };
    c.budget += bud;
    c.realized += real;
    catMap.set(cat, c);

    const v = villMap.get(b.villageId) ?? { budget: 0, realized: 0 };
    v.budget += bud;
    v.realized += real;
    villMap.set(b.villageId, v);
  }

  const monthMap = new Map<string, { income: number; expense: number }>();
  for (const t of transactions) {
    const m = t.transactionDate.toISOString().slice(0, 7);
    const entry = monthMap.get(m) ?? { income: 0, expense: 0 };
    const amt = Number(t.amount);
    if (t.type === "income") entry.income += amt;
    else entry.expense += amt;
    monthMap.set(m, entry);
  }

  const villageMeta = new Map(villages.map((v) => [v.id, v]));
  const byVillage = Array.from(villMap.entries())
    .map(([villageId, v]) => {
      const meta = villageMeta.get(villageId);
      return {
        villageId,
        code: meta?.code ?? "",
        name: meta?.name ?? "",
        district: meta?.district ?? "",
        budget: v.budget,
        realized: v.realized,
        realizationPct:
          v.budget > 0 ? Math.round((v.realized / v.budget) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => a.realizationPct - b.realizationPct);

  return {
    scope,
    villagesIncluded: villageIds.length,
    year,
    totals: {
      budgetAmount,
      realizedAmount,
      realizationPct:
        budgetAmount > 0
          ? Math.round((realizedAmount / budgetAmount) * 1000) / 10
          : 0,
    },
    byCategory: Array.from(catMap.entries())
      .map(([category, v]) => ({
        category,
        budget: v.budget,
        realized: v.realized,
      }))
      .sort((a, b) => b.budget - a.budget),
    byVillage,
    monthlyTrend: Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, ...v })),
  };
}

export type RegionalServicesPayload = {
  scope: RegionalScope;
  villagesIncluded: number;
  mail: {
    totalServices: number;
    pendingRequests: number;
    byDistrict: Array<{ district: string; services: number; pending: number }>;
  };
  citizenReports: {
    open: number;
    resolved: number;
    byCategory: Array<{ category: string; count: number }>;
  };
  socialBenefits: {
    activePrograms: number;
    beneficiaries: number;
  };
  engagement: {
    announcements: number;
    forumThreads: number;
    kioskDevices: number;
  };
};

export async function aggregateRegionalServices(
  scope: RegionalScope,
  villageIds: number[],
  villages: VillageInScope[],
): Promise<RegionalServicesPayload> {
  const emptyDistrict = (): RegionalServicesPayload["mail"]["byDistrict"] => [];
  if (villageIds.length === 0) {
    return {
      scope,
      villagesIncluded: 0,
      mail: { totalServices: 0, pendingRequests: 0, byDistrict: emptyDistrict() },
      citizenReports: { open: 0, resolved: 0, byCategory: [] },
      socialBenefits: { activePrograms: 0, beneficiaries: 0 },
      engagement: { announcements: 0, forumThreads: 0, kioskDevices: 0 },
    };
  }

  const [
    mailServices,
    pendingRequests,
    reports,
    programs,
    beneficiaries,
    announcements,
    forumThreads,
    kioskDevices,
  ] = await Promise.all([
    prisma.mailService.count({ where: { villageId: { in: villageIds } } }),
    prisma.mailRequest.count({
      where: { villageId: { in: villageIds }, status: "pending" },
    }),
    prisma.citizenReport.findMany({
      where: { villageId: { in: villageIds } },
      select: { status: true, reportType: true, villageId: true },
    }),
    prisma.socialBenefitProgram.count({
      where: { villageId: { in: villageIds }, isActive: true },
    }),
    prisma.socialBenefitBeneficiary.count({
      where: {
        program: { villageId: { in: villageIds } },
        status: { in: ["registered", "under_review", "approved", "active"] },
      },
    }),
    prisma.announcement.count({ where: { villageId: { in: villageIds } } }),
    prisma.forumThread.count({ where: { villageId: { in: villageIds } } }),
    prisma.kioskDevice.count({
      where: { villageId: { in: villageIds }, isActive: true },
    }),
  ]);

  const villageDistrict = new Map(villages.map((v) => [v.id, v.district]));
  const districtMail = new Map<string, { services: number; pending: number }>();

  const mailByVillage = await prisma.mailService.groupBy({
    by: ["villageId"],
    where: { villageId: { in: villageIds } },
    _count: { id: true },
  });
  const pendingByVillage = await prisma.mailRequest.groupBy({
    by: ["villageId"],
    where: { villageId: { in: villageIds }, status: "pending" },
    _count: { id: true },
  });

  for (const m of mailByVillage) {
    const d = villageDistrict.get(m.villageId) ?? "—";
    const entry = districtMail.get(d) ?? { services: 0, pending: 0 };
    entry.services += m._count.id;
    districtMail.set(d, entry);
  }
  for (const p of pendingByVillage) {
    const d = villageDistrict.get(p.villageId) ?? "—";
    const entry = districtMail.get(d) ?? { services: 0, pending: 0 };
    entry.pending += p._count.id;
    districtMail.set(d, entry);
  }

  const catMap = new Map<string, number>();
  let open = 0;
  let resolved = 0;
  for (const r of reports) {
    if (r.status === "DONE") resolved++;
    else if (r.status !== "REJECT") open++;
    const cat = r.reportType || "Lainnya";
    catMap.set(cat, (catMap.get(cat) ?? 0) + 1);
  }

  return {
    scope,
    villagesIncluded: villageIds.length,
    mail: {
      totalServices: mailServices,
      pendingRequests,
      byDistrict: Array.from(districtMail.entries())
        .map(([district, v]) => ({ district, ...v }))
        .sort((a, b) => b.services - a.services),
    },
    citizenReports: {
      open,
      resolved,
      byCategory: Array.from(catMap.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count),
    },
    socialBenefits: { activePrograms: programs, beneficiaries },
    engagement: { announcements, forumThreads, kioskDevices },
  };
}

export type RegionalGisPayload = {
  scope: RegionalScope;
  villagesIncluded: number;
  points: Array<{
    id: string;
    type: "asset" | "project" | "disaster";
    name: string;
    villageName: string;
    district: string;
    lat: number;
    lng: number;
    status?: string;
  }>;
  summary: {
    assets: number;
    projects: number;
    disasterPoints: number;
  };
};

export async function aggregateRegionalGis(
  scope: RegionalScope,
  villageIds: number[],
  villages: VillageInScope[],
): Promise<RegionalGisPayload> {
  if (villageIds.length === 0) {
    return {
      scope,
      villagesIncluded: 0,
      points: [],
      summary: { assets: 0, projects: 0, disasterPoints: 0 },
    };
  }

  const villageMeta = new Map(villages.map((v) => [v.id, v]));
  const [assets, projects, disasters] = await Promise.all([
    prisma.villageAsset.findMany({
      where: { villageId: { in: villageIds }, lat: { not: null }, lng: { not: null } },
      select: { id: true, name: true, villageId: true, lat: true, lng: true, status: true },
    }),
    prisma.infrastructureProject.findMany({
      where: { villageId: { in: villageIds }, lat: { not: null }, lng: { not: null } },
      select: { id: true, title: true, villageId: true, lat: true, lng: true, status: true },
    }),
    prisma.disasterPoint.findMany({
      where: { villageId: { in: villageIds }, lat: { not: null }, lng: { not: null } },
      select: { id: true, name: true, villageId: true, lat: true, lng: true, riskLevel: true },
    }),
  ]);

  const points: RegionalGisPayload["points"] = [];
  for (const a of assets) {
    if (a.lat == null || a.lng == null) continue;
    const v = villageMeta.get(a.villageId);
    points.push({
      id: `asset-${a.id}`,
      type: "asset",
      name: a.name,
      villageName: v?.name ?? "",
      district: v?.district ?? "",
      lat: a.lat,
      lng: a.lng,
      status: a.status,
    });
  }
  for (const p of projects) {
    if (p.lat == null || p.lng == null) continue;
    const v = villageMeta.get(p.villageId);
    points.push({
      id: `project-${p.id}`,
      type: "project",
      name: p.title,
      villageName: v?.name ?? "",
      district: v?.district ?? "",
      lat: p.lat,
      lng: p.lng,
      status: p.status,
    });
  }
  for (const d of disasters) {
    if (d.lat == null || d.lng == null) continue;
    const v = villageMeta.get(d.villageId);
    points.push({
      id: `disaster-${d.id}`,
      type: "disaster",
      name: d.name,
      villageName: v?.name ?? "",
      district: v?.district ?? "",
      lat: d.lat,
      lng: d.lng,
      status: d.riskLevel,
    });
  }

  return {
    scope,
    villagesIncluded: villageIds.length,
    points,
    summary: {
      assets: assets.length,
      projects: projects.length,
      disasterPoints: disasters.length,
    },
  };
}

export type RegionalAlert = {
  type: "subscription" | "stunting" | "finance" | "reports" | "sync";
  severity: "warning" | "critical";
  villageId: number;
  villageName: string;
  district: string;
  message: string;
};

export async function aggregateRegionalAlerts(
  villageIds: number[],
  villages: VillageInScope[],
  financeByVillage: RegionalFinancePayload["byVillage"],
  avgStuntingRate: number | null,
): Promise<RegionalAlert[]> {
  const alerts: RegionalAlert[] = [];
  const year = new Date().getFullYear();

  for (const v of villages) {
    if (v.isActive && !v.subscriptionActive) {
      alerts.push({
        type: "subscription",
        severity: "warning",
        villageId: v.id,
        villageName: v.name,
        district: v.district,
        message: "Langganan tidak aktif — data mungkin tidak masuk agregat.",
      });
    }
  }

  if (villageIds.length > 0 && avgStuntingRate != null) {
    const stuntingByVillage = await prisma.resident.groupBy({
      by: ["villageId"],
      where: { villageId: { in: villageIds }, isAlive: true, isStunting: true },
      _count: { id: true },
    });
    const totalByVillage = await prisma.resident.groupBy({
      by: ["villageId"],
      where: { villageId: { in: villageIds }, isAlive: true },
      _count: { id: true },
    });
    const totalMap = new Map(totalByVillage.map((t) => [t.villageId, t._count.id]));
    const villageMeta = new Map(villages.map((v) => [v.id, v]));

    for (const s of stuntingByVillage) {
      const total = totalMap.get(s.villageId) ?? 0;
      if (total < 10) continue;
      const rate = (s._count.id / total) * 100;
      if (rate > avgStuntingRate * 1.5 && rate > 10) {
        const meta = villageMeta.get(s.villageId);
        alerts.push({
          type: "stunting",
          severity: rate > 20 ? "critical" : "warning",
          villageId: s.villageId,
          villageName: meta?.name ?? "",
          district: meta?.district ?? "",
          message: `Prevalensi stunting ${Math.round(rate)}% (di atas rata-rata wilayah).`,
        });
      }
    }
  }

  for (const fv of financeByVillage) {
    if (fv.budget > 0 && fv.realizationPct < 50) {
      alerts.push({
        type: "finance",
        severity: fv.realizationPct < 30 ? "critical" : "warning",
        villageId: fv.villageId,
        villageName: fv.name,
        district: fv.district,
        message: `Realisasi APBDes ${year} hanya ${fv.realizationPct}%.`,
      });
    }
  }

  const oldReports = await prisma.citizenReport.findMany({
    where: {
      villageId: { in: villageIds },
      status: { notIn: ["DONE", "REJECT"] },
      createdAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    select: { villageId: true },
  });
  const reportCounts = new Map<number, number>();
  for (const r of oldReports) {
    reportCounts.set(r.villageId, (reportCounts.get(r.villageId) ?? 0) + 1);
  }
  const villageMeta = new Map(villages.map((v) => [v.id, v]));
  for (const [villageId, count] of reportCounts) {
    if (count >= 3) {
      const meta = villageMeta.get(villageId);
      alerts.push({
        type: "reports",
        severity: "warning",
        villageId,
        villageName: meta?.name ?? "",
        district: meta?.district ?? "",
        message: `${count} pengaduan terbuka lebih dari 30 hari.`,
      });
    }
  }

  return alerts.slice(0, 50);
}

/** Digital Village Index — composite KPI untuk overview */
export function computeDigitalVillageIndex(params: {
  subscriptionPct: number;
  syncPct: number;
  avgSdgsScore: number | null;
  financeRealizationPct: number;
  moduleAdoptionAvg: number;
}): number {
  const sdgs = params.avgSdgsScore ?? 50;
  const index =
    params.subscriptionPct * 0.25 +
    params.syncPct * 0.15 +
    sdgs * 0.25 +
    params.financeRealizationPct * 0.2 +
    params.moduleAdoptionAvg * 0.15;
  return Math.round(Math.min(100, Math.max(0, index)));
}

export function villageMatchesBpsCodes(
  settings: unknown,
  kodeProvinsi?: string | null,
  kodeKabKota?: string | null,
): boolean {
  if (!kodeProvinsi && !kodeKabKota) return true;
  const codes = parseWilayahSettings(settings);
  if (kodeProvinsi && codes.kode_provinsi !== kodeProvinsi) return false;
  if (kodeKabKota && codes.kode_kab_kota !== kodeKabKota) return false;
  return true;
}
