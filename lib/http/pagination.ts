/**
 * Paginasi offset yang aman untuk query string dari klien (tidak dipercaya).
 * Dulu beberapa rute memakai `Number(sp.get("pageSize"))` mentah: `pageSize=100000` memuat seluruh tabel
 * (6 MB untuk 5.000 warga), dan `NaN`/negatif/desimal menghasilkan `take`/`skip` tak valid.
 */
export type PageParams = { page: number; pageSize: number; skip: number };

function toInt(raw: string | null | undefined): number | null {
  if (raw == null || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.floor(n) : null;
}

/** Batas atas `page` agar `skip` tidak meluap atau memaksa pemindaian ekstrem. */
export const MAX_PAGE = 100_000;

export function parsePageParams(
  sp: URLSearchParams,
  opts: { defaultPageSize: number; maxPageSize: number },
): PageParams {
  const page = Math.min(MAX_PAGE, Math.max(1, toInt(sp.get("page")) ?? 1));
  const requested = toInt(sp.get("pageSize")) ?? opts.defaultPageSize;
  const pageSize = Math.min(opts.maxPageSize, Math.max(1, requested));
  return { page, pageSize, skip: (page - 1) * pageSize };
}
