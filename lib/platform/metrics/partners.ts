/** Statistik mitra & komisi (server). */
import { prisma } from "@/lib/prisma";
import { toNum } from "./aggregate";

export type CommissionBucket = { count: number; amount: number };
export type PartnerStats = {
  partnersActive: number;
  applicationsNew: number;
  /** accrued = tertunda (belum disetujui); approved = disetujui (siap dicairkan); disbursed = sudah dicairkan. Yang dibatalkan tidak dihitung. */
  commission: { accrued: CommissionBucket; approved: CommissionBucket; disbursed: CommissionBucket };
  /** Pencairan yang belum selesai (pending/processing). */
  disbursementsWaiting: CommissionBucket;
  topPartners: Array<{ partnerId: number; name: string; amount: number; entries: number; villages: number }>;
};

const zero = (): CommissionBucket => ({ count: 0, amount: 0 });

export async function computePartnerStats(): Promise<PartnerStats> {
  const [partnersActive, applicationsNew, byStatus, waiting, top] = await Promise.all([
    prisma.partner.count({ where: { status: "active" } }),
    prisma.partnerApplication.count({ where: { status: "NEW" } }),
    prisma.partnerCommissionEntry.groupBy({ by: ["status"], _sum: { amount: true }, _count: { _all: true } }),
    prisma.partnerDisbursement.aggregate({ where: { status: { in: ["pending", "processing"] } }, _sum: { amount: true }, _count: { _all: true } }),
    prisma.partnerCommissionEntry.groupBy({
      by: ["partnerId"],
      where: { status: { in: ["accrued", "approved", "disbursed"] } },
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    }),
  ]);

  const commission = { accrued: zero(), approved: zero(), disbursed: zero() };
  for (const r of byStatus) {
    if (r.status === "accrued" || r.status === "approved" || r.status === "disbursed") {
      commission[r.status] = { count: r._count._all, amount: toNum(r._sum.amount) };
    }
  }

  const ids = top.map((t) => t.partnerId);
  const [names, villageCounts] = ids.length
    ? await Promise.all([
        prisma.partner.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
        prisma.village.groupBy({ by: ["acquiredByPartnerId"], where: { acquiredByPartnerId: { in: ids } }, _count: { _all: true } }),
      ])
    : [[], []];
  const nameOf = new Map(names.map((n) => [n.id, n.name]));
  const villagesOf = new Map(villageCounts.map((v) => [v.acquiredByPartnerId, v._count._all]));

  return {
    partnersActive,
    applicationsNew,
    commission,
    disbursementsWaiting: { count: waiting._count._all, amount: toNum(waiting._sum.amount) },
    topPartners: top.map((t) => ({
      partnerId: t.partnerId,
      name: nameOf.get(t.partnerId) ?? `Mitra #${t.partnerId}`,
      amount: toNum(t._sum.amount),
      entries: t._count._all,
      villages: villagesOf.get(t.partnerId) ?? 0,
    })),
  };
}
