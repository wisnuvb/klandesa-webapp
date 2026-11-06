/** Statistik desa & estimasi MRR (server). Agregat berparameter; tanpa memuat baris desa mentah (kecuali daftar kecil <= 10). */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { TRIAL_DAYS } from "@/lib/subscription";
import { BILLING_CATALOG } from "@/lib/billing/catalog";
import { WEBSITE_CUSTOM_MODULE_CODE } from "@/lib/website-service/subscription";
import { GRACE_DAYS_FOR_METRICS, ratio, toNum, VILLAGE_STATUS_CLASSES, type VillageStatusClass } from "./aggregate";
import { computeMrr, type MrrEstimate } from "./mrr";
import { DAY_MS, last12MonthBuckets, WIB_OFFSET_HOURS } from "./period";

export type VillageGrowthPoint = { key: string; label: string; registered: number; converted: number };
export type CountRow = { label: string; count: number };

export type VillageStats = {
  total: number;
  byStatus: Record<VillageStatusClass, number>;
  /** Berlangganan aktif yang berakhir dalam <=7/14/30 hari (kumulatif; satu desa masuk semua jendela yang memuatnya). */
  expiring: { d7: number; d14: number; d30: number };
  growth: VillageGrowthPoint[];
  /** Konversi trial -> berbayar: desa yang mendaftar 90 hari terakhir dan masa trial-nya sudah selesai, yang pernah membayar Paket Desa. */
  conversion: { windowDays: number; eligible: number; converted: number; rate: number | null };
  /** Kasar: langganan berbayar yang habis 30 hari terakhir dan belum diperpanjang. */
  churn: { windowDays: number; churned: number; base: number; rate: number | null };
  topProvinces: CountRow[];
  topRegencies: CountRow[];
  bySource: CountRow[];
  byPartner: Array<{ partnerId: number; name: string; count: number }>;
  mrr: MrrEstimate;
};

const paidPackageExists = Prisma.sql`EXISTS (SELECT 1 FROM billing_invoices i WHERE i.villageId = v.id AND i.status = 'paid' AND i.productType = 'desa_package')`;

export async function statusCounts(now: Date): Promise<{ total: number; byStatus: Record<VillageStatusClass, number> }> {
  const graceCut = new Date(now.getTime() - GRACE_DAYS_FOR_METRICS * DAY_MS);
  // Cermin classifyVillageStatus() (aggregate.ts). Ubah keduanya bersamaan; tes integrasi membandingkan keduanya.
  const rows = await prisma.$queryRaw<Array<{ cls: string; n: bigint }>>(Prisma.sql`
    SELECT cls, COUNT(*) AS n FROM (
      SELECT CASE
        WHEN isActive = 0 OR LOWER(subscriptionStatus) = 'cancelled' THEN 'nonaktif'
        WHEN LOWER(subscriptionStatus) = 'active' AND (subscriptionExpiry IS NULL OR subscriptionExpiry > ${now}) THEN 'aktif'
        WHEN LOWER(subscriptionStatus) = 'trial' AND (subscriptionExpiry IS NULL OR subscriptionExpiry > ${now}) THEN 'trial'
        WHEN LOWER(subscriptionStatus) = 'grace' AND (subscriptionExpiry IS NULL OR subscriptionExpiry > ${now}) THEN 'tenggang'
        WHEN LOWER(subscriptionStatus) = 'trial' AND subscriptionExpiry > ${graceCut} THEN 'tenggang'
        ELSE 'kedaluwarsa' END AS cls
      FROM villages
    ) t GROUP BY cls`);
  const byStatus = Object.fromEntries(VILLAGE_STATUS_CLASSES.map((c) => [c, 0])) as Record<VillageStatusClass, number>;
  let total = 0;
  for (const r of rows) {
    const n = toNum(r.n);
    total += n;
    if ((VILLAGE_STATUS_CLASSES as readonly string[]).includes(r.cls)) byStatus[r.cls as VillageStatusClass] += n;
  }
  return { total, byStatus };
}

async function expiringCounts(now: Date) {
  const within = (days: number) =>
    prisma.village.count({
      where: { isActive: true, subscriptionStatus: "active", subscriptionExpiry: { gt: now, lte: new Date(now.getTime() + days * DAY_MS) } },
    });
  const [d7, d14, d30] = await Promise.all([within(7), within(14), within(30)]);
  return { d7, d14, d30 };
}

async function growthSeries(now: Date): Promise<VillageGrowthPoint[]> {
  const buckets = last12MonthBuckets(now);
  const from = buckets[0].start;
  const to = buckets[buckets.length - 1].end;
  const rows = await prisma.$queryRaw<Array<{ k: string; n: bigint; conv: Prisma.Decimal | bigint | null }>>(Prisma.sql`
    SELECT DATE_FORMAT(DATE_ADD(v.createdAt, INTERVAL ${WIB_OFFSET_HOURS} HOUR), '%Y-%m') AS k, COUNT(*) AS n,
      SUM(CASE WHEN ${paidPackageExists} THEN 1 ELSE 0 END) AS conv
    FROM villages v WHERE v.createdAt >= ${from} AND v.createdAt < ${to} GROUP BY k`);
  const map = new Map(rows.map((r) => [String(r.k), { registered: toNum(r.n), converted: toNum(r.conv) }]));
  return buckets.map((b) => ({ key: b.key, label: b.label, registered: map.get(b.key)?.registered ?? 0, converted: map.get(b.key)?.converted ?? 0 }));
}

async function conversion(now: Date) {
  const windowDays = 90;
  const from = new Date(now.getTime() - windowDays * DAY_MS);
  const trialEnded = new Date(now.getTime() - TRIAL_DAYS * DAY_MS);
  const [row] = await prisma.$queryRaw<Array<{ n: bigint; conv: Prisma.Decimal | bigint | null }>>(Prisma.sql`
    SELECT COUNT(*) AS n, SUM(CASE WHEN ${paidPackageExists} THEN 1 ELSE 0 END) AS conv
    FROM villages v WHERE v.createdAt >= ${from} AND v.createdAt <= ${trialEnded}`);
  const eligible = toNum(row?.n);
  const converted = toNum(row?.conv);
  return { windowDays, eligible, converted, rate: ratio(converted, eligible) };
}

async function churn(now: Date, activeNow: number) {
  const windowDays = 30;
  const from = new Date(now.getTime() - windowDays * DAY_MS);
  const [row] = await prisma.$queryRaw<Array<{ n: bigint }>>(Prisma.sql`
    SELECT COUNT(*) AS n FROM villages v
    WHERE v.isActive = 1 AND LOWER(v.subscriptionStatus) IN ('active', 'inactive')
      AND v.subscriptionExpiry >= ${from} AND v.subscriptionExpiry < ${now}
      AND ${paidPackageExists}`);
  const churned = toNum(row?.n);
  const base = activeNow + churned;
  return { windowDays, churned, base, rate: ratio(churned, base) };
}

async function distribution() {
  const [prov, reg, src, partners] = await Promise.all([
    prisma.village.groupBy({ by: ["province"], _count: { _all: true }, orderBy: { _count: { province: "desc" } }, take: 10 }),
    prisma.village.groupBy({ by: ["province", "regency"], _count: { _all: true }, orderBy: { _count: { regency: "desc" } }, take: 10 }),
    prisma.$queryRaw<Array<{ src: string; n: bigint }>>(Prisma.sql`
      SELECT SUBSTRING_INDEX(COALESCE(NULLIF(acquisitionSource, ''), 'mandiri'), ':', 1) AS src, COUNT(*) AS n
      FROM villages GROUP BY src ORDER BY n DESC LIMIT 10`),
    prisma.village.groupBy({
      by: ["acquiredByPartnerId"], where: { acquiredByPartnerId: { not: null } },
      _count: { _all: true }, orderBy: { _count: { acquiredByPartnerId: "desc" } }, take: 10,
    }),
  ]);
  const ids = partners.map((p) => p.acquiredByPartnerId).filter((x): x is number => x != null);
  const names = ids.length ? await prisma.partner.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : [];
  const nameOf = new Map(names.map((n) => [n.id, n.name]));
  return {
    topProvinces: prov.map((p) => ({ label: p.province, count: p._count._all })),
    topRegencies: reg.map((p) => ({ label: `${p.regency}, ${p.province}`, count: p._count._all })),
    bySource: src.map((s) => ({ label: String(s.src), count: toNum(s.n) })),
    byPartner: partners.map((p) => ({ partnerId: p.acquiredByPartnerId as number, name: nameOf.get(p.acquiredByPartnerId as number) ?? `Mitra #${p.acquiredByPartnerId}`, count: p._count._all })),
  };
}

export async function mrrEstimate(now: Date): Promise<MrrEstimate> {
  const y1From = new Date(now.getTime() - 365 * DAY_MS);
  const lengkapSetup = BILLING_CATALOG.desa_package.tiers.lengkap.setupFee;
  const websiteSetup = BILLING_CATALOG.website_custom.setupFee;
  const aliveActive = Prisma.sql`v.isActive = 1 AND LOWER(v.subscriptionStatus) = 'active' AND (v.subscriptionExpiry IS NULL OR v.subscriptionExpiry > ${now})`;
  // Pelanggan NYATA: aktif + pernah punya tagihan paket lunas. Add-on/GPS/kredit AI hanya dihitung dari desa ini.
  const aliveActivePaid = Prisma.sql`${aliveActive} AND ${paidPackageExists}`;
  const aiFrom = new Date(now.getTime() - 90 * DAY_MS);

  const [pkgRows, modRows, gpsRows, aiRows] = await Promise.all([
    prisma.$queryRaw<Array<{ plan: string; fy: bigint | number; ever: bigint | number; n: bigint }>>(Prisma.sql`
      SELECT LOWER(v.subscriptionPlan) AS plan,
        EXISTS (SELECT 1 FROM billing_invoices i WHERE i.villageId = v.id AND i.status = 'paid' AND i.productType = 'desa_package'
          AND i.planCode = 'lengkap' AND i.amount >= ${lengkapSetup} AND i.paidAt >= ${y1From}) AS fy,
        ${paidPackageExists} AS ever,
        COUNT(*) AS n
      FROM villages v WHERE ${aliveActive}
      GROUP BY plan, fy, ever`),
    prisma.$queryRaw<Array<{ moduleCode: string; planCode: string | null; vplan: string | null; fy: bigint | number; n: bigint }>>(Prisma.sql`
      SELECT m.moduleCode AS moduleCode, m.planCode AS planCode, LOWER(v.subscriptionPlan) AS vplan,
        CASE WHEN m.moduleCode = ${WEBSITE_CUSTOM_MODULE_CODE} THEN
          EXISTS (SELECT 1 FROM billing_invoices i WHERE i.villageId = v.id AND i.status = 'paid' AND i.productType = 'website_custom'
            AND i.amount >= ${websiteSetup} AND i.paidAt >= ${y1From})
        ELSE 0 END AS fy,
        COUNT(*) AS n
      FROM village_module_subscriptions m JOIN villages v ON v.id = m.villageId
      WHERE m.status = 'active' AND m.expiryDate > ${now} AND ${aliveActivePaid}
      GROUP BY m.moduleCode, m.planCode, vplan, fy`),
    prisma.$queryRaw<Array<{ n: bigint }>>(Prisma.sql`
      SELECT COUNT(*) AS n FROM villages v
      WHERE v.absensiGpsAddonActive = 1 AND v.absensiGpsAddonExpiry > ${now} AND ${aliveActivePaid}`),
    prisma.$queryRaw<Array<{ n: bigint; total: Prisma.Decimal | bigint | number | null }>>(Prisma.sql`
      SELECT COUNT(DISTINCT i.villageId) AS n, COALESCE(SUM(i.amount), 0) AS total
      FROM billing_invoices i JOIN villages v ON v.id = i.villageId
      WHERE i.status = 'paid' AND i.productType = 'ai_credits' AND i.paidAt > ${aiFrom} AND i.paidAt <= ${now} AND ${aliveActivePaid}`),
  ]);

  return computeMrr({
    packages: pkgRows.map((r) => ({ plan: String(r.plan ?? ""), firstYear: toNum(r.fy) > 0, everPaid: toNum(r.ever) > 0, count: toNum(r.n) })),
    modules: modRows.map((r) => ({ moduleCode: r.moduleCode, planCode: r.planCode, villagePlan: r.vplan, firstYear: toNum(r.fy) > 0, count: toNum(r.n) })),
    gpsAddonVillages: toNum(gpsRows[0]?.n),
    aiCredit: { villages: toNum(aiRows[0]?.n), total90d: toNum(aiRows[0]?.total) },
  });
}

export async function computeVillageStats(now: Date): Promise<VillageStats> {
  const [status, expiring, growth, conv, dist, mrr] = await Promise.all([
    statusCounts(now), expiringCounts(now), growthSeries(now), conversion(now), distribution(), mrrEstimate(now),
  ]);
  const ch = await churn(now, status.byStatus.aktif);
  return { total: status.total, byStatus: status.byStatus, expiring, growth, conversion: conv, churn: ch, ...dist, mrr };
}
