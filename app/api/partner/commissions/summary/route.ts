import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiSession } from "@/lib/api-session";
import { getPartnerSession } from "@/lib/partner-session";
import { toJSONSafe } from "@/utils/json";

export async function GET(req: NextRequest) {
  const session = await getApiSession(req);
  const partner = getPartnerSession(session);
  if (!partner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const partnerId = partner.partnerId;

  const [rule, byStatus, byTypeStatus] = await Promise.all([
    prisma.partnerCommissionRule.findUnique({
      where: { partnerId },
    }),
    prisma.partnerCommissionEntry.groupBy({
      by: ["status"],
      where: { partnerId, status: { not: "cancelled" } },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.partnerCommissionEntry.groupBy({
      by: ["type", "status"],
      where: { partnerId, status: { not: "cancelled" } },
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);

  let sumAccrued = 0;
  let sumApproved = 0;
  let sumDisbursed = 0;
  for (const row of byStatus) {
    const amt = Number(row._sum.amount ?? 0);
    if (row.status === "accrued") sumAccrued += amt;
    if (row.status === "approved") sumApproved += amt;
    if (row.status === "disbursed") sumDisbursed += amt;
  }

  return NextResponse.json(
    toJSONSafe({
      totals: {
        accrued: Math.round(sumAccrued),
        approved: Math.round(sumApproved),
        disbursed: Math.round(sumDisbursed),
        /** Menunggu payout: komisi sudah di-approve belum dibayarkan. */
        pendingPayout: Math.round(sumApproved),
      },
      byStatus,
      byTypeStatus,
      rule:
        rule == null
          ? null
          : {
              closingBonusAmount: rule.closingBonusAmount,
              subscriptionSharePercent: rule.subscriptionSharePercent,
              isActive: rule.isActive,
              effectiveFrom: rule.effectiveFrom,
            },
    }),
    { status: 200 },
  );
}
