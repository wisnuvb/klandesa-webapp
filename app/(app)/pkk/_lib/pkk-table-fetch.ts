import type {
  DataTableFetchParams,
  DataTableFetchResult,
} from "@/components/ui/data-table";

export function buildPkkListUrl(
  path: string,
  params: DataTableFetchParams,
  extra?: Record<string, string>,
): string {
  const url = new URL(path, window.location.origin);
  url.searchParams.set("page", String(params.page));
  url.searchParams.set("pageSize", String(params.pageSize));
  if (params.sortKey) url.searchParams.set("sortKey", params.sortKey);
  if (params.sortOrder) url.searchParams.set("sortOrder", params.sortOrder);
  if (params.search) url.searchParams.set("search", params.search);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      url.searchParams.set(k, v);
    }
  }
  return url.toString();
}

export async function fetchPkkList<T>(
  path: string,
  params: DataTableFetchParams,
  extra?: Record<string, string>,
): Promise<DataTableFetchResult<T>> {
  const res = await fetch(buildPkkListUrl(path, params, extra), { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Gagal memuat data",
    );
  }
  return data as DataTableFetchResult<T>;
}
