/**
 * Backfill ReferralCode aktif (tanpa partnerId) menjadi Partner + CommissionRule,
 * menggunakan email pemilik yang valid.
 *
 * Jalankan: npx tsx scripts/backfill-referral-partner-links.ts
 */
import "@/env";
import { prisma } from "@/lib/prisma";
import { provisionPartnerFromReferralCodeTx } from "@/lib/partner/provision";

async function main() {
  const rows = await prisma.referralCode.findMany({
    where: {
      partnerId: null,
      status: "active",
      NOT: { ownerEmail: null },
      ownerEmail: { not: "" },
    },
    select: { id: true, code: true, ownerEmail: true },
    orderBy: { id: "asc" },
  });

  console.log(`Found ${rows.length} active referral codes without partner link.`);

  for (const r of rows) {
    try {
      const { partnerId } = await prisma.$transaction((tx) =>
        provisionPartnerFromReferralCodeTx(tx, r.id),
      );
      console.log(`OK  ${r.code}: partner #${partnerId}`);
    } catch (e) {
      console.warn(
        `SKIP ${r.code} (${r.ownerEmail ?? "no-email"}):`,
        e instanceof Error ? e.message : e,
      );
    }
  }
}

void main().finally(() => {
  void prisma.$disconnect();
});
