/** Paginasi daftar blog (murni, tanpa dependensi). */

export const BLOG_PAGE_SIZE = 12;

export type PageItem = number | "ellipsis";

/** Jumlah halaman, minimal 1 (daftar kosong tetap punya halaman 1). */
export function totalPagesOf(total: number, pageSize: number = BLOG_PAGE_SIZE): number {
  if (!Number.isFinite(total) || total <= 0) return 1;
  return Math.ceil(total / pageSize);
}

/**
 * Nilai `?page=` → nomor halaman. Tanpa parameter = 1. Hanya bilangan bulat positif tanpa nol di depan
 * (maks 6 digit); selain itu `null` (pemanggil menjawab 404, supaya tidak ada URL duplikat "?page=01").
 */
export function parsePageParam(raw: string | string[] | undefined): number | null {
  if (raw === undefined) return 1;
  if (typeof raw !== "string") return null;
  return /^[1-9]\d{0,5}$/.test(raw) ? Number(raw) : null;
}

/** URL halaman: halaman 1 = jalur dasar tanpa query (satu URL kanonik). */
export function pageHref(basePath: string, page: number): string {
  return page <= 1 ? basePath : `${basePath}?page=${page}`;
}

/**
 * Nomor halaman yang ditampilkan: selalu halaman pertama dan terakhir, jendela `siblings` di kiri-kanan halaman
 * aktif, dan elipsis hanya bila melompati ≥2 halaman (celah satu halaman diisi angkanya, bukan elipsis).
 */
export function pageItems(current: number, total: number, siblings = 1): PageItem[] {
  if (total <= 1) return [1];
  const cur = Math.min(Math.max(1, current), total);
  const wanted = new Set<number>([1, total]);
  for (let p = cur - siblings; p <= cur + siblings; p++) if (p >= 1 && p <= total) wanted.add(p);
  const sorted = [...wanted].sort((a, b) => a - b);
  const out: PageItem[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    const prev = sorted[i - 1];
    if (prev !== undefined) {
      if (p - prev === 2) out.push(prev + 1);
      else if (p - prev > 2) out.push("ellipsis");
    }
    out.push(p);
  }
  return out;
}
