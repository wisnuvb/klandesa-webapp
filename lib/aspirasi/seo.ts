import { AREA_INDEX_MIN_ITEMS, INDEX_GRACE_DAYS, INDEX_MIN_BODY_CHARS } from "./catalog";

/**
 * Pagar pengindeksan (Fase E). SEMUA halaman aspirasi publik noindex dan keluar dari sitemap sampai pemilik menyalakan
 * `ASPIRASI_INDEXING=on` di lingkungan server. Setelah menyala, sebuah laporan baru layak indeks bila:
 * tayang, tidak ditandai noindex, tidak punya laporan konten yang masih terbuka, lewat masa tenggang, dan isinya cukup panjang.
 */
export function isAspirasiIndexingEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.ASPIRASI_INDEXING?.trim().toLowerCase() === "on";
}

export type IndexableInput = {
  status: string;
  noindex: boolean;
  publishedAt: Date | null;
  bodyLength: number;
  openFlags: number;
};

export function isAspirationIndexable(a: IndexableInput, now: Date = new Date(), env: NodeJS.ProcessEnv = process.env): boolean {
  if (!isAspirasiIndexingEnabled(env)) return false;
  if (a.status !== "PUBLISHED" || a.noindex || a.openFlags > 0 || !a.publishedAt) return false;
  if (a.bodyLength < INDEX_MIN_BODY_CHARS) return false;
  return now.getTime() - a.publishedAt.getTime() >= INDEX_GRACE_DAYS * 24 * 60 * 60_000;
}

/** Halaman desa diindeks bila ada cukup laporan layak indeks (menghindari halaman tipis). */
export function isAreaIndexable(indexableCount: number, env: NodeJS.ProcessEnv = process.env): boolean {
  return isAspirasiIndexingEnabled(env) && indexableCount >= AREA_INDEX_MIN_ITEMS;
}

/** Batas waktu `publishedAt` agar laporan sudah lewat masa tenggang (untuk filter kueri). */
export function indexGraceCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - INDEX_GRACE_DAYS * 24 * 60 * 60_000);
}

export const ROBOTS_NOINDEX = { index: false, follow: true } as const;
export const ROBOTS_INDEX = { index: true, follow: true } as const;
