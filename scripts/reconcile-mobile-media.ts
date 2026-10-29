/**
 * Samakan penghitung kuota foto seluler (village_media_usage) dengan isi bucket yang sebenarnya.
 * Perlu dijalankan sesekali: penghitung bisa sedikit lebih tinggi dari kenyataan (unggahan yang dibatalkan, foto yatim).
 *
 * Jalankan: npx tsx scripts/reconcile-mobile-media.ts [kodeDesa]
 * Tanpa argumen, semua desa aktif diproses satu per satu.
 */
import "@/env";
import { prisma } from "@/lib/prisma";
import { getSpacesConfig } from "@/lib/spaces";
import { reconcileMobileMedia } from "@/lib/mobile/media-usage";

const mb = (n: number | null) => (n == null ? "-" : `${(n / 1024 / 1024).toFixed(1)} MB`);

async function main() {
  const code = process.argv[2];
  const villages = await prisma.village.findMany({
    where: { isActive: true, ...(code ? { code } : {}) },
    select: { id: true, code: true },
    orderBy: { id: "asc" },
  });
  const { bucket } = getSpacesConfig();
  console.log(`Merekonsiliasi ${villages.length} desa...`);
  for (const v of villages) {
    try {
      const r = await reconcileMobileMedia(v, bucket);
      console.log(`OK  ${v.code}: ${mb(r.before)} -> ${mb(r.after)}`);
    } catch (e) {
      console.error(`ERR ${v.code}:`, e instanceof Error ? e.message : e);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
