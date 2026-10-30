/**
 * Perbaiki tagihan top-up kredit AI yang sudah "paid" tetapi kreditnya tidak pernah masuk
 * (bug: aktivasi membaca `invoice.metadata.credits`, padahal checkout hanya menyimpan `{ userId }`).
 *
 *   node --env-file=.env --import tsx scripts/repair-ai-credit-invoices.ts            # simulasi (tidak menulis)
 *   node --env-file=.env --import tsx scripts/repair-ai-credit-invoices.ts --apply    # tambahkan kredit
 *
 * Yang dianggap rusak: productType `ai_credits`, status `paid`, metadata tagihan TANPA `credits` dan TANPA penanda
 * `creditsAppliedAt`. Tagihan era lama yang menyimpan `credits` di metadata sudah pernah dikreditkan, jadi dilewati.
 * Aman dijalankan berulang: setiap tagihan yang diperbaiki diberi penanda `creditsAppliedAt` dalam transaksi yang sama.
 * Cadangkan DB dulu bila dijalankan di produksi.
 */
import { prisma } from "../lib/prisma";
import { AI_CREDITS_APPLIED_KEY, aiCreditsAlreadyApplied, resolveAiCreditGrant } from "../lib/billing/ai-credit-grant";

const apply = process.argv.includes("--apply");

function hasCreditsInInvoiceMeta(metadata: unknown): boolean {
  return metadata != null && typeof metadata === "object" && (metadata as Record<string, unknown>).credits != null;
}

async function main() {
  const paid = await prisma.billingInvoice.findMany({
    where: { productType: "ai_credits", status: "paid" },
    include: { items: true },
    orderBy: { paidAt: "asc" },
  });
  const broken = paid.filter((i) => !hasCreditsInInvoiceMeta(i.metadata) && !aiCreditsAlreadyApplied(i.metadata));

  console.log(`${apply ? "TERAPKAN" : "SIMULASI"} — ${paid.length} tagihan ai_credits lunas, ${broken.length} perlu diperbaiki\n`);

  let fixed = 0;
  let skipped = 0;
  for (const inv of broken) {
    const r = resolveAiCreditGrant(inv);
    const label = `${inv.invoiceNumber} (dibayar ${inv.paidAt?.toISOString() ?? "?"})`;
    if (!r.ok) {
      console.log(`  LEWATI  ${label}: ${r.error}`);
      skipped++;
      continue;
    }
    const { userId, credits } = r.grant;
    if (!apply) {
      console.log(`  AKAN    ${label}: +${credits} kredit → user ${userId}`);
      continue;
    }
    const done = await prisma.$transaction(async (tx) => {
      // Baca ulang di dalam transaksi supaya dua proses yang berjalan bersamaan tidak mengkreditkan dua kali.
      const fresh = await tx.billingInvoice.findUnique({ where: { id: inv.id }, select: { metadata: true } });
      if (!fresh || aiCreditsAlreadyApplied(fresh.metadata)) return false;
      const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (!user) throw new Error(`user ${userId} tidak ada`);
      await tx.user.update({ where: { id: userId }, data: { aiCredits: { increment: credits } } });
      await tx.billingInvoice.update({
        where: { id: inv.id },
        data: {
          metadata: {
            ...(typeof fresh.metadata === "object" && fresh.metadata ? (fresh.metadata as object) : {}),
            [AI_CREDITS_APPLIED_KEY]: new Date().toISOString(),
            creditsRepairedBy: "scripts/repair-ai-credit-invoices.ts",
          },
        },
      });
      return true;
    });
    if (done) {
      console.log(`  OK      ${label}: +${credits} kredit → user ${userId}`);
      fixed++;
    }
  }

  console.log(`\nSelesai. diperbaiki=${fixed} dilewati=${skipped}${apply ? "" : " (simulasi; tambahkan --apply untuk menulis)"}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
