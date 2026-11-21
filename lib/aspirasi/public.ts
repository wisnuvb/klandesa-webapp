/**
 * Kueri baca publik untuk halaman Aspirasi Warga yang tidak ada di service.ts: hitung laporan layak-indeks per desa
 * dan daftar entri sitemap. Sengaja TANPA cache: takedown/moderasi harus langsung terlihat (kueri ringan dan berindeks).
 * Tidak pernah memilih kolom pribadi pelapor.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { INDEX_MIN_BODY_CHARS } from "./catalog";
import { indexGraceCutoff, isAreaIndexable, isAspirasiIndexingEnabled } from "./seo";
import type { Db } from "./service";

const INDEXABLE_BASE = (now: Date): Prisma.AspirationWhereInput => ({
  status: "PUBLISHED",
  noindex: false,
  publishedAt: { lte: indexGraceCutoff(now) },
  flags: { none: { status: "OPEN" } },
});

/** Jumlah laporan layak-indeks sebuah desa (pagar: tayang, tidak noindex, lewat masa tenggang, tanpa flag terbuka, isi cukup panjang). */
export async function countIndexableForArea(db: Db, areaId: number, now: Date = new Date()): Promise<number> {
  if (!isAspirasiIndexingEnabled()) return 0;
  const rows = await db.aspiration.findMany({ where: { areaId, ...INDEXABLE_BASE(now) }, select: { body: true }, take: 500 });
  return rows.filter((r) => r.body.length >= INDEX_MIN_BODY_CHARS).length;
}

export async function areaIndexable(db: Db, areaId: number, now: Date = new Date()): Promise<boolean> {
  return isAreaIndexable(await countIndexableForArea(db, areaId, now));
}

export type AspirasiSitemapEntries = {
  hub: boolean;
  areas: Array<{ slug: string }>;
  aspirations: Array<{ slug: string; code: string; lastModified: Date | null }>;
};

const SITEMAP_LIMIT = 5000;

/** Entri sitemap; kosong bila pengindeksan belum dinyalakan (ASPIRASI_INDEXING=on). */
export async function listAspirasiSitemapEntries(now: Date = new Date()): Promise<AspirasiSitemapEntries> {
  if (!isAspirasiIndexingEnabled()) return { hub: false, areas: [], aspirations: [] };
  const rows = await prisma.aspiration.findMany({
    where: INDEXABLE_BASE(now),
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: SITEMAP_LIMIT,
    select: { code: true, slug: true, body: true, updatedAt: true, publishedAt: true, area: { select: { slug: true } } },
  });
  const ok = rows.filter((r) => r.body.length >= INDEX_MIN_BODY_CHARS);
  const perArea = new Map<string, number>();
  for (const r of ok) perArea.set(r.area.slug, (perArea.get(r.area.slug) ?? 0) + 1);
  return {
    hub: ok.length >= 1,
    areas: [...perArea.entries()].filter(([, n]) => isAreaIndexable(n)).map(([slug]) => ({ slug })),
    aspirations: ok.map((r) => ({ slug: r.slug, code: r.code, lastModified: r.updatedAt ?? r.publishedAt })),
  };
}
