/**
 * Sinkronkan katalog surat global (format dokumen v2) ke database.
 *
 *   npx tsx scripts/sync-letter-catalog.ts          # tulis ke database
 *   npx tsx scripts/sync-letter-catalog.ts --dry    # hanya validasi & tampilkan ringkasan
 *
 * Upsert berdasarkan `catalogKey` (villageId=null, isGlobal=true). Template milik desa
 * (salinan/"Sesuaikan") tidak disentuh.
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import { catalogRowsForSeed } from "../lib/mail/catalogTemplates";

async function main() {
  const dry = process.argv.includes("--dry");
  const rows = catalogRowsForSeed(); // melempar bila ada dokumen tidak valid

  if (dry) {
    for (const r of rows) console.log(`• ${r.catalogKey}  ${r.name}  (${r.category})`);
    console.log(`Dry run: ${rows.length} template valid, tidak ada yang ditulis.`);
    return;
  }

  const prisma = new PrismaClient();
  let created = 0;
  let updated = 0;
  try {
    for (const row of rows) {
      const exists = await prisma.mailTemplate.findUnique({
        where: { catalogKey: row.catalogKey },
        select: { id: true },
      });
      await prisma.mailTemplate.upsert({
        where: { catalogKey: row.catalogKey },
        create: {
          catalogKey: row.catalogKey,
          villageId: null,
          isGlobal: true,
          isActive: true,
          name: row.name,
          description: row.description,
          category: row.category,
          templateStructure: row.templateStructure as Prisma.InputJsonValue,
          contentTemplate: row.contentTemplate,
        },
        update: {
          isGlobal: true,
          isActive: true,
          name: row.name,
          description: row.description,
          category: row.category,
          templateStructure: row.templateStructure as Prisma.InputJsonValue,
          contentTemplate: row.contentTemplate,
        },
      });
      if (exists) updated++;
      else created++;
    }
  } finally {
    await prisma.$disconnect();
  }
  console.log(`Katalog surat disinkronkan: ${created} dibuat, ${updated} diperbarui (total ${rows.length}).`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
