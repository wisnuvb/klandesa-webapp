/**
 * Uji coba backfill kependudukan v2: BACA-SAJA. Tidak menulis apa pun ke DB.
 * Menampilkan kualitas data KK/wilayah per desa (anomali, varian RT/RW) tanpa nama/NIK/alamat.
 *
 *   npx tsx scripts/kependudukan-dryrun.ts                    # semua desa
 *   npx tsx scripts/kependudukan-dryrun.ts --village 12       # satu desa (id atau kode)
 *   npx tsx scripts/kependudukan-dryrun.ts --json out.json    # simpan juga sebagai JSON
 *
 * Lihat docs/PHASE1_KEPENDUDUKAN_DESIGN.md (tahap B).
 */
import { writeFileSync } from "node:fs";
import { prisma } from "@/lib/prisma";
import { buildDryRunReport, type DryRunReport } from "@/lib/kependudukan/dryrun";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function print(name: string, code: string, r: DryRunReport) {
  const flag = r.verdict === "SIAP" ? "SIAP" : r.verdict === "KOSONG" ? "BELUM ADA WARGA" : "PERLU PERBAIKAN";
  console.log(`\n=== ${name} (${code}) — ${flag}`);
  console.log(`Warga: ${r.totals.residents} (aktif ${r.totals.active}, sudah pindah/meninggal ${r.totals.leftVillage}); tanpa KK sah: ${r.totals.withoutValidKk}`);
  console.log(`Rumah tangga: ${r.households.total}, berkepala ${r.households.withHead}, bermasalah ${r.households.withAnomaly} (bersih ${r.households.cleanPercent}%)`);
  console.log(`Wilayah: ${r.wilayah.dusun} dusun, ${r.wilayah.rw} RW, ${r.wilayah.rt} RT; warga tanpa wilayah: ${r.wilayah.unassigned}`);
  const ik = r.invalidKk;
  if (ik.tooShort + ik.tooLong > 0) {
    console.log(`  KK tak sah: ${ik.tooShort} terlalu pendek (${ik.suspectedExcelTruncation} diduga terpotong Excel), ${ik.tooLong} terlalu panjang`);
  }
  for (const a of r.anomalies) {
    console.log(`  - ${a.label}: ${a.count}`);
    for (const s of a.samples.slice(0, 2)) console.log(`      contoh KK ${s.kk ?? "-"} → warga id ${s.residentIds.join(", ")}`);
  }
  if (r.wilayah.mergedVariants.length) {
    console.log("  Varian tulisan RT/RW/dusun yang akan digabung:");
    for (const v of r.wilayah.mergedVariants.slice(0, 5)) console.log(`      "${v.label}" ← ${v.variants.map((x) => `"${x}"`).join(", ")}`);
  }
}

async function main() {
  const only = arg("village");
  const jsonPath = arg("json");

  const where = only ? (/^\d+$/.test(only) ? { id: Number(only) } : { code: only }) : {};
  const villages = await prisma.village.findMany({ where, select: { id: true, code: true, name: true }, orderBy: { id: "asc" } });
  if (villages.length === 0) {
    console.log(only ? `Desa "${only}" tidak ditemukan.` : "Belum ada desa.");
    return;
  }

  const out: Array<{ villageId: number; code: string; name: string; report: DryRunReport }> = [];
  for (const v of villages) {
    const residents = await prisma.resident.findMany({
      where: { villageId: v.id },
      select: { id: true, kk: true, familyRole: true, isAlive: true, moveDate: true, rt: true, rw: true, hamlet: true, address: true, birthDate: true },
    });
    const report = buildDryRunReport(residents);
    out.push({ villageId: v.id, code: v.code, name: v.name, report });
    print(v.name, v.code, report);
  }

  const siap = out.filter((o) => o.report.verdict === "SIAP").length;
  const kosong = out.filter((o) => o.report.verdict === "KOSONG").length;
  console.log(`\nRingkasan: ${out.length} desa — ${siap} siap, ${out.length - siap - kosong} perlu perbaikan, ${kosong} belum ada warga. (Tidak ada data yang diubah.)`);

  if (jsonPath) {
    writeFileSync(jsonPath, JSON.stringify({ generatedAt: new Date().toISOString(), villages: out }, null, 2));
    console.log(`JSON disimpan: ${jsonPath}`);
  }
}

main()
  .catch((e) => {
    console.error("Gagal menjalankan uji coba:", e instanceof Error ? e.message.split("\n").slice(-3).join(" ") : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
