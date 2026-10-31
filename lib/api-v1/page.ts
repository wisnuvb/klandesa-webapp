/** Paginasi kursor berbasis id untuk /api/v1: stabil walau data bertambah di tengah penelusuran. */

export const DEFAULT_LIMIT = 25;
export const MAX_LIMIT = 100;

export type PagingParse = { ok: true; limit: number; cursor: number | null } | { ok: false; message: string };

export const encodeCursor = (id: number): string => `c1_${Buffer.from(String(id)).toString("base64url")}`;

export function decodeCursor(raw: string): number | null {
  if (!raw.startsWith("c1_")) return null;
  const id = Number(Buffer.from(raw.slice(3), "base64url").toString());
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function parsePaging(sp: URLSearchParams): PagingParse {
  const rawLimit = sp.get("limit");
  let limit = DEFAULT_LIMIT;
  if (rawLimit != null) {
    const n = Number(rawLimit);
    if (!Number.isInteger(n) || n < 1 || n > MAX_LIMIT) return { ok: false, message: `limit harus bilangan bulat 1 sampai ${MAX_LIMIT}.` };
    limit = n;
  }
  const rawCursor = sp.get("cursor");
  if (rawCursor == null || rawCursor === "") return { ok: true, limit, cursor: null };
  const cursor = decodeCursor(rawCursor);
  return cursor == null ? { ok: false, message: "cursor tidak valid. Pakai nilai page.nextCursor dari jawaban sebelumnya." } : { ok: true, limit, cursor };
}

/** `rows` diambil dengan take = limit + 1; sisa satu baris menandakan masih ada halaman berikutnya. */
export function slicePage<T>(rows: T[], limit: number, idOf: (r: T) => number): { data: T[]; page: { limit: number; hasMore: boolean; nextCursor: string | null } } {
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  return { data, page: { limit, hasMore, nextCursor: hasMore && data.length ? encodeCursor(idOf(data[data.length - 1])) : null } };
}
