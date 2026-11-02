#!/usr/bin/env tsx
/**
 * Isi/segarkan cermin data pangan SP2KP (seeding awal setelah migrasi, atau dijalankan manual).
 * Contoh: tsx scripts/sync-pangan.ts --force --deadline=1200
 * Opsi: --scope=all|wilayah|harga  --force (paksa ambil ulang daftar kab/kota)  --deadline=<detik> (default 1200)
 */
import { mirror } from "@/lib/pangan/service";
import { syncPangan, type SyncScope } from "@/lib/pangan/sync";

function arg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
}

async function main() {
  const scope = (arg("scope") ?? "all") as SyncScope;
  const deadline = Number(arg("deadline")) || 1200;
  const force = process.argv.includes("--force");
  console.log(`[pangan-sync] start scope=${scope} force=${force} deadline=${deadline}s`);
  const report = await syncPangan({ scope, force, deadlineMs: deadline * 1000 }, { mirror });
  console.log("[pangan-sync] done", JSON.stringify(report, null, 2));
  const failed = (report.wilayah?.failed ?? 0) + (report.harga?.failed ?? 0);
  process.exit(failed > 0 || report.incomplete ? 1 : 0);
}

main().catch((error) => {
  console.error("[pangan-sync] fatal:", error);
  process.exit(1);
});
