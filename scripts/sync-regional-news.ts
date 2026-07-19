#!/usr/bin/env tsx
/**
 * Sync berita regional (Google News RSS) per kabupaten desa aktif.
 * Crontab contoh: 0 6 * * * cd /var/www/html/klandesa/klandesa-webapp && tsx scripts/sync-regional-news.ts
 */
import { isRegionalNewsEnabled } from "@/lib/regional-news/config";
import { syncAllActiveRegions } from "@/lib/regional-news/service";

async function main() {
  if (!isRegionalNewsEnabled()) {
    console.log("[regional-news] disabled via REGIONAL_NEWS_ENABLED");
    process.exit(0);
  }

  const force = process.argv.includes("--force");
  console.log(`[regional-news] sync start force=${force}`);
  const result = await syncAllActiveRegions({ force });
  console.log(
    `[regional-news] done total=${result.total} synced=${result.synced} skipped=${result.skipped} failed=${result.failed}`,
  );
  process.exit(result.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("[regional-news] fatal:", error);
  process.exit(1);
});
