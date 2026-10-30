/**
 * Membuat baris `website_domains` untuk desa yang membeli website lewat checkout lama.
 * Checkout lama hanya menyimpan alamat di `village.website` / `subscription.customDomain`,
 * padahal routing memakai tabel `website_domains`, jadi alamat pilihan desa tidak pernah aktif.
 *
 * Jalankan (simulasi, tidak menulis apa pun): npx tsx scripts/backfill-website-domains.ts
 * Jalankan (menulis):                          npx tsx scripts/backfill-website-domains.ts --apply
 *
 * Subdomain dibuat `active`. Custom domain dibuat `pending_verification` dengan token baru;
 * desa harus memasang TXT dan menekan "Verifikasi DNS" di panel domain.
 * Aman dijalankan ulang: baris yang sudah ada dilewati.
 */
import "@/env";
import { prisma } from "@/lib/prisma";
import { planWebsiteDomainBackfill } from "@/lib/domain/backfill";
import {
  createWebsiteDomainEvent,
  registerPendingCustomDomainInTx,
  registerPrimarySubdomainInTx,
  websiteRootDomain,
} from "@/lib/domain/service";

async function main() {
  const apply = process.argv.includes("--apply");

  const [subs, domains, villages] = await Promise.all([
    prisma.websiteSubscription.findMany({
      select: { customDomain: true, villageId: true },
    }),
    prisma.websiteDomain.findMany({ select: { hostname: true, villageId: true } }),
    prisma.village.findMany({ select: { id: true, code: true, website: true } }),
  ]);

  const villageById = new Map(villages.map((v) => [v.id, v]));
  const plan = planWebsiteDomainBackfill({
    rows: subs.flatMap((s) => {
      const v = villageById.get(s.villageId);
      return v
        ? [{ villageId: s.villageId, code: v.code, website: v.website, customDomain: s.customDomain }]
        : [];
    }),
    rootDomain: websiteRootDomain(),
    existingDomains: new Map(domains.map((d) => [d.hostname.toLowerCase(), d.villageId])),
    villageCodes: new Map(villages.map((v) => [v.code.toLowerCase(), v.id])),
  });

  console.log(
    `${subs.length} langganan diperiksa: ${plan.alreadyOk} sudah beres, ${plan.actions.length} perlu dibuat, ${plan.conflicts.length} konflik.`,
  );
  for (const c of plan.conflicts) {
    console.log(`KONFLIK ${c.code}: ${c.hostname} (${c.reason}) - perlu ditangani manual`);
  }
  for (const a of plan.actions) {
    console.log(`${apply ? "BUAT " : "AKAN BUAT "} ${a.code}: ${a.hostname} [${a.kind}]`);
  }
  if (!apply) {
    console.log("Simulasi saja. Tambahkan --apply untuk menulis.");
    return;
  }

  const villagesWithDomain = new Set(domains.map((d) => d.villageId));
  for (const a of plan.actions) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const r =
          a.kind === "subdomain"
            ? await registerPrimarySubdomainInTx(tx, {
                villageId: a.villageId,
                label: a.hostname.slice(0, a.hostname.indexOf(".")),
                // Jangan menurunkan domain utama yang sudah dipakai desa.
                makePrimary: !villagesWithDomain.has(a.villageId),
              })
            : await registerPendingCustomDomainInTx(tx, {
                villageId: a.villageId,
                hostname: a.hostname,
              });
        if (!r.ok) return r;
        const row = await tx.websiteDomain.findUnique({
          where: { hostname: a.hostname },
          select: { id: true },
        });
        return { ...r, domainId: row?.id };
      });
      if (!result.ok) {
        console.error(`GAGAL ${a.code}: ${result.error}`);
        continue;
      }
      if (result.domainId) {
        await createWebsiteDomainEvent({
          domainId: result.domainId,
          kind: "created",
          message: "Dibuat otomatis oleh backfill checkout lama",
          meta: { type: a.kind, hostname: a.hostname },
        });
      }
    } catch (e) {
      console.error(`ERR ${a.code}:`, e instanceof Error ? e.message : e);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
