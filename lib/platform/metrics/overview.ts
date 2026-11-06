/** Ringkasan dasbor owner: satu muatan (KPI + perhatian + grafik) yang di-cache 60 detik. */
import { cachedMetric } from "./cache";
import { pctChange } from "./aggregate";
import { computeAttention, type AttentionItem } from "./attention";
import { computePartnerStats, type PartnerStats } from "./partners";
import { resolveMonthComparison, WIB_TIMEZONE } from "./period";
import { computeRevenue, paidTotals, type RevenueReport } from "./revenue";
import { computeUsageStats, type UsageStats } from "./usage";
import { computeVillageStats, type VillageStats } from "./villages";

export type OverviewKpis = {
  revenueThisMonth: { amount: number; count: number };
  revenueLastMonth: { amount: number; count: number };
  /** Bulan lalu pada rentang waktu yang sama dengan bulan berjalan (pembanding yang adil). */
  revenueLastMonthSamePeriod: { amount: number; count: number };
  revenueChangePct: number | null;
  mrr: number;
  arr: number;
  activeVillages: number;
  trialRunning: number;
  expiringSoon: { d7: number; d14: number; d30: number };
  trialConversionRate: number | null;
  churnRate: number | null;
};

export type OverviewPayload = {
  generatedAt: string;
  timezone: typeof WIB_TIMEZONE;
  /** Selalu true: angka MRR/ARR adalah perkiraan. */
  mrrIsEstimate: true;
  kpis: OverviewKpis;
  attention: AttentionItem[];
  revenue12m: RevenueReport;
  villages: VillageStats;
  partners: PartnerStats;
  usage: UsageStats;
};

export async function computeOverview(now: Date): Promise<OverviewPayload> {
  const cmp = resolveMonthComparison(now);
  const [thisMonth, lastMonth, lastSame, revenue12m, villages, partners, usage, attention] = await Promise.all([
    paidTotals(cmp.thisStart, new Date(now.getTime() + 1)),
    paidTotals(cmp.lastStart, cmp.lastEnd),
    paidTotals(cmp.lastStart, cmp.lastSamePeriodEnd),
    computeRevenue("12m", now),
    computeVillageStats(now),
    computePartnerStats(),
    computeUsageStats(now),
    computeAttention(now),
  ]);
  return {
    generatedAt: now.toISOString(),
    timezone: WIB_TIMEZONE,
    mrrIsEstimate: true,
    kpis: {
      revenueThisMonth: thisMonth,
      revenueLastMonth: lastMonth,
      revenueLastMonthSamePeriod: lastSame,
      revenueChangePct: pctChange(thisMonth.amount, lastSame.amount),
      mrr: villages.mrr.mrr,
      arr: villages.mrr.arr,
      activeVillages: villages.byStatus.aktif,
      trialRunning: villages.byStatus.trial,
      expiringSoon: villages.expiring,
      trialConversionRate: villages.conversion.rate,
      churnRate: villages.churn.rate,
    },
    attention,
    revenue12m,
    villages,
    partners,
    usage,
  };
}

export function getOverview(): Promise<OverviewPayload> {
  return cachedMetric("overview", () => computeOverview(new Date()));
}
