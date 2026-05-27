import type {
  DataTableFetchParams,
  DataTableFetchResult,
} from "@/components/ui/data-table";

/** Paginasi/sort client-side untuk API yang mengembalikan semua baris. */
export async function fetchClientPagedList<T extends Record<string, unknown>>(
  path: string,
  params: DataTableFetchParams,
  searchKeys: (keyof T & string)[],
): Promise<DataTableFetchResult<T>> {
  const res = await fetch(path, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Gagal memuat data",
    );
  }
  let rows = (data.rows ?? []) as T[];
  const q = params.search?.trim().toLowerCase();
  if (q) {
    rows = rows.filter((row) =>
      searchKeys.some((key) =>
        String(row[key] ?? "")
          .toLowerCase()
          .includes(q),
      ),
    );
  }
  if (params.sortKey) {
    const key = params.sortKey as keyof T;
    const dir = params.sortOrder === "desc" ? -1 : 1;
    rows = [...rows].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return (av - bv) * dir;
      }
      return String(av).localeCompare(String(bv), "id") * dir;
    });
  }
  const total = rows.length;
  const start = (params.page - 1) * params.pageSize;
  return {
    rows: rows.slice(start, start + params.pageSize),
    total,
  };
}
