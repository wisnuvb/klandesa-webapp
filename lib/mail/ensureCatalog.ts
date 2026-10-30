/**
 * Pastikan katalog jenis surat bawaan (v2) ada di database tanpa menunggu `scripts/sync-letter-catalog.ts`.
 *
 * Desa yang sudah lama terdaftar bisa membuka "Buat Surat" dan mendapati daftar kosong karena database-nya
 * belum disinkronkan (baris katalog belum ada, atau masih berformat lama). Daftar jenis surat memanggil ini
 * sebelum membaca, sehingga katalog muncul sendiri.
 *
 * Aturannya sengaja sempit:
 * - hanya baris katalog global yang BELUM berformat v2 yang ditulis (dibuat atau dinaikkan di tempat, id tetap
 *   sehingga salinan desa dan riwayat surat tetap tersambung);
 * - baris v2 tidak disentuh, jadi baris yang sengaja dinonaktifkan tidak diaktifkan lagi dan tidak ada
 *   penimpaan isi. Memperbarui isi katalog yang sudah v2 tetap tugas skrip sinkron.
 */
import type { PrismaClient } from "@prisma/client";
import { buildCatalogInserts, getAllCatalogDefinitions } from "./catalogTemplates";

export async function seedMissingCatalog(db: PrismaClient): Promise<number> {
  const defs = getAllCatalogDefinitions();
  const current = await db.mailTemplate.findMany({
    where: {
      villageId: null,
      isGlobal: true,
      catalogKey: { in: defs.map((d) => d.catalogKey) },
      templateStructure: { path: "$.schemaVersion", equals: 2 },
    },
    select: { catalogKey: true },
  });
  const have = new Set(current.map((r) => r.catalogKey));
  const todo = defs.filter((d) => !have.has(d.catalogKey));

  for (const def of todo) {
    const row = buildCatalogInserts(def); // melempar bila dokumen katalog tidak valid
    const fields = {
      isGlobal: true,
      isActive: true,
      name: row.name,
      description: row.description,
      category: row.category,
      templateStructure: row.templateStructure,
      contentTemplate: row.contentTemplate,
    };
    await db.mailTemplate.upsert({
      where: { catalogKey: row.catalogKey },
      create: { catalogKey: row.catalogKey, villageId: null, ...fields },
      update: fields,
    });
  }
  return todo.length;
}

// Sekali per proses: setelah sukses, permintaan berikutnya tidak menyentuh database untuk ini.
let ready: Promise<void> | null = null;

/** Tidak pernah melempar: bila gagal, daftar tetap dibaca apa adanya dan percobaan diulang di permintaan berikutnya. */
export function ensureCatalogSeeded(db: PrismaClient): Promise<void> {
  ready ??= seedMissingCatalog(db)
    .then(() => undefined)
    .catch((err) => {
      ready = null;
      console.error("ensureCatalogSeeded:", err instanceof Error ? err.message : err);
    });
  return ready;
}

/** Hanya untuk pengujian. */
export function resetCatalogSeedState() {
  ready = null;
}
