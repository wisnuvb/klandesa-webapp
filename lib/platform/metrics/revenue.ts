/** Pengambil data pendapatan (server). Semua agregat lewat groupBy/aggregate/$queryRaw berparameter; tanpa memuat baris besar. */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { invoiceStatusWhere } from "@/lib/billing/invoice-filters";
import { fillSeries, pctChange, toNum, type SeriesPoint } from "./aggregate";
import { cachedMetric } from "./cache";
import { productLabel } from "./invoices";
import { resolveRevenueRange, WIB_OFFSET_HOURS, WIB_TIMEZONE, type Granularity, type RevenueRange } from "./period";

export type RevenueBreakdownRow = { productType: string; planCode: string; label: string; amount: number; count: number; share: number | null };
export type InvoiceIssueTotals = { count: number; amount: number };
export type LatestPayment = { id: string; invoiceNumber: string; villageId: number; villageName: string; product: string; amount: number; paidAt: string };

export type RevenueReport = {
  range: RevenueRange;
  granularity: Granularity;
  timezone: typeof WIB_TIMEZONE;
  from: string;
  to: string;
  generatedAt: string;
  series: SeriesPoint[];
  total: { amount: number; count: number; average: number | null };
  previous: { amount: number; count: number; from: string; to: string };
  /** Perubahan relatif terhadap periode pembanding; null bila pembanding 0. */
  changePct: number | null;
  byProduct: RevenueBreakdownRow[];
  /** Tagihan DIBUAT dalam rentang, belum lunas. "expired" mencakup pending yang lewat batas bayar. */
  issues: { pending: InvoiceIssueTotals; expired: InvoiceIssueTotals; failed: InvoiceIssueTotals };
  latest: LatestPayment[];
};

/** Total pembayaran lunas pada [from, to) berdasarkan tanggal bayar. */
export async function paidTotals(from: Date, to: Date): Promise<{ amount: number; count: number }> {
  const r = await prisma.billingInvoice.aggregate({
    where: { status: "paid", paidAt: { gte: from, lt: to } },
    _sum: { amount: true },
    _count: { _all: true },
  });
  return { amount: toNum(r._sum.amount), count: r._count._all };
}

/** Deret pendapatan per bucket WIB (kunci "YYYY-MM-DD" atau "YYYY-MM"). */
export async function paidSeriesRows(from: Date, to: Date, granularity: Granularity): Promise<Array<{ key: string; amount: number; count: number }>> {
  const fmt = granularity === "day" ? "%Y-%m-%d" : "%Y-%m";
  const rows = await prisma.$queryRaw<Array<{ k: string; n: bigint; s: Prisma.Decimal | number | null }>>(
    Prisma.sql`SELECT DATE_FORMAT(DATE_ADD(paidAt, INTERVAL ${WIB_OFFSET_HOURS} HOUR), ${fmt}) AS k, COUNT(*) AS n, COALESCE(SUM(amount), 0) AS s
      FROM billing_invoices
      WHERE status = 'paid' AND paidAt >= ${from} AND paidAt < ${to}
      GROUP BY k`,
  );
  return rows.map((r) => ({ key: String(r.k), amount: toNum(r.s), count: toNum(r.n) }));
}

async function issueTotals(filter: "pending" | "expired" | "failed", from: Date, to: Date, now: Date): Promise<InvoiceIssueTotals> {
  const r = await prisma.billingInvoice.aggregate({
    where: { AND: [invoiceStatusWhere(filter, now), { createdAt: { gte: from, lt: to } }] },
    _sum: { amount: true },
    _count: { _all: true },
  });
  return { count: r._count._all, amount: toNum(r._sum.amount) };
}

export async function latestPayments(take = 8): Promise<LatestPayment[]> {
  const rows = await prisma.billingInvoice.findMany({
    where: { status: "paid", paidAt: { not: null } },
    orderBy: { paidAt: "desc" },
    take: Math.min(Math.max(take, 1), 20),
    select: { id: true, invoiceNumber: true, villageId: true, productType: true, amount: true, paidAt: true, village: { select: { name: true } } },
  });
  return rows.map((r) => ({
    id: String(r.id), invoiceNumber: r.invoiceNumber, villageId: r.villageId, villageName: r.village.name,
    product: productLabel(r.productType), amount: toNum(r.amount), paidAt: (r.paidAt as Date).toISOString(),
  }));
}

export async function computeRevenue(range: RevenueRange, now: Date): Promise<RevenueReport> {
  const r = resolveRevenueRange(range, now);
  const [seriesRows, prev, products, pending, expired, failed, latest] = await Promise.all([
    paidSeriesRows(r.from, r.to, r.granularity),
    paidTotals(r.prevFrom, r.prevTo),
    prisma.billingInvoice.groupBy({
      by: ["productType", "planCode"],
      where: { status: "paid", paidAt: { gte: r.from, lt: r.to } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    issueTotals("pending", r.from, r.to, now),
    issueTotals("expired", r.from, r.to, now),
    issueTotals("failed", r.from, r.to, now),
    latestPayments(8),
  ]);

  const series = fillSeries(r.buckets, seriesRows);
  const amount = series.reduce((t, p) => t + p.amount, 0);
  const count = series.reduce((t, p) => t + p.count, 0);
  const byProduct: RevenueBreakdownRow[] = products
    .map((p) => ({
      productType: p.productType,
      planCode: p.planCode,
      label: productLabel(p.productType),
      amount: toNum(p._sum.amount),
      count: p._count._all,
      share: null as number | null,
    }))
    .sort((a, b) => b.amount - a.amount);
  for (const row of byProduct) row.share = amount > 0 ? row.amount / amount : null;

  return {
    range,
    granularity: r.granularity,
    timezone: WIB_TIMEZONE,
    from: r.from.toISOString(),
    to: r.to.toISOString(),
    generatedAt: now.toISOString(),
    series,
    total: { amount, count, average: count > 0 ? amount / count : null },
    previous: { amount: prev.amount, count: prev.count, from: r.prevFrom.toISOString(), to: r.prevTo.toISOString() },
    changePct: pctChange(amount, prev.amount),
    byProduct,
    issues: { pending, expired, failed },
    latest,
  };
}

/** Versi ber-cache 60 dtk (kunci per rentang). */
export function getRevenue(range: RevenueRange): Promise<RevenueReport> {
  return cachedMetric(`revenue:${range}`, () => computeRevenue(range, new Date()));
}
