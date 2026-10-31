/**
 * Backfill/rekonsiliasi kependudukan v2 untuk SATU desa. Default = uji coba (tidak menulis).
 * Hanya mengisi tabel bayangan (households, wilayah_units, + tiga kolom tautan di residents); kolom lama tidak diubah.
 *
 *   npx tsx --env-file=.env scripts/kependudukan-backfill.ts --village 9                  # uji coba: hanya laporan
 *   npx tsx --env-file=.env scripts/kependudukan-backfill.ts --village 9 --apply          # tulis (idempotent)
 *   npx tsx --env-file=.env scripts/kependudukan-backfill.ts --village 9 --apply --enable # + nyalakan bendera desa
 *
 * Lihat docs/PHASE1_KEPENDUDUKAN_DESIGN.md (tahap C).
 */
import { prisma } from "@/lib/prisma";
import { buildDryRunReport } from "@/lib/kependudukan/dryrun";
import { reconcileVillage, SETTINGS_FLAG, SETTINGS_NEEDS_RECONCILE } from "@/lib/kependudukan/sync";
import type { Prisma } from "@prisma/client";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const flag = (name: string) => process.argv.includes(`--${name}`);

async function main() {
  const only = arg("village");
  if (!only) throw new Error("Wajib menyebut desa: --village <id|kode>. Skrip ini sengaja tidak berjalan untuk semua desa.");
  const village = await prisma.village.findFirst({
    where: /^\d+$/.test(only) ? { id: Number(only) } : { code: only },
    select: { id: true, code: true, name: true, settings: true },
  });
  if (!village) throw new Error(`Desa "${only}" tidak ditemukan.`);

  const residents = await prisma.resident.findMany({
    where: { villageId: village.id },
    select: { id: true, kk: true, familyRole: true, isAlive: true, moveDate: true, rt: true, rw: true, hamlet: true, address: true, birthDate: true },
  });
  const report = buildDryRunReport(residents);
  console.log(`Desa ${village.name} (${village.code}, id ${village.id}): ${report.totals.residents} warga, ${report.households.total} rumah tangga, ${report.wilayah.rw} RW, ${report.wilayah.rt} RT, ${report.wilayah.dusun} dusun.`);
  console.log(`Kualitas: ${report.households.cleanPercent}% rumah tangga bersih; ${report.households.withAnomaly} bermasalah; ${report.totals.withoutValidKk} warga tanpa KK sah. Verdict: ${report.verdict}.`);

  if (!flag("apply")) {
    console.log("\nMode uji coba: TIDAK ada yang ditulis. Tambahkan --apply untuk mengisi struktur bayangan.");
    return;
  }

  const before = {
    households: await prisma.household.count({ where: { villageId: village.id } }),
    units: await prisma.wilayahUnit.count({ where: { villageId: village.id } }),
  };
  const started = Date.now();
  const result = await reconcileVillage(prisma, village.id);
  console.log(`\nRekonsiliasi selesai dalam ${Date.now() - started} ms:`, result);
  console.log(`Sebelumnya: ${before.households} rumah tangga, ${before.units} unit wilayah.`);

  // Bukti idempotensi: jalankan lagi, harus nol perubahan.
  const again = await reconcileVillage(prisma, village.id);
  const clean = Object.values(again).every((n) => n === 0);
  console.log(`Pemeriksaan ulang (harus nol perubahan): ${clean ? "OK" : "TIDAK nol!"}`, again);

  const cur = village.settings && typeof village.settings === "object" && !Array.isArray(village.settings) ? (village.settings as Record<string, unknown>) : {};
  const next: Record<string, unknown> = { ...cur };
  delete next[SETTINGS_NEEDS_RECONCILE];
  if (flag("enable")) next[SETTINGS_FLAG] = true;
  if (flag("enable") || SETTINGS_NEEDS_RECONCILE in cur) {
    await prisma.village.update({ where: { id: village.id }, data: { settings: next as Prisma.InputJsonValue } });
  }
  console.log(flag("enable") ? "Bendera kependudukanV2 DINYALAKAN untuk desa ini." : "Bendera tidak diubah (tambahkan --enable untuk menyalakan).");
  if (!clean) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error("Gagal:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
