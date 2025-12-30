/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "./utils";
import { Input } from "./input";
import { Button } from "./button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./pagination";
import { ArrowDown, ArrowUp, Loader2, RefreshCw, Search } from "lucide-react";

export type DataTableFetchParams = {
  page: number; // 1-based
  pageSize: number;
  sortKey?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  filters?: Record<string, unknown>;
};

export type DataTableFetchResult<T> = {
  rows: T[];
  total: number; // total records across all pages
};

export type DataTableColumn<T> = {
  key: string; // field name used for sorting and default accessor
  header: ReactNode;
  sortable?: boolean;
  width?: string | number;
  align?: "left" | "center" | "right";
  className?: string;
  cell?: (row: T, index: number) => React.ReactNode; // custom render
};

export type DataTableProps<T extends Record<string, any>> = {
  columns: DataTableColumn<T>[];
  fetchData: (params: DataTableFetchParams) => Promise<DataTableFetchResult<T>>;
  initialPageSize?: number;
  initialSort?: { key: string; order: "asc" | "desc" };
  initialSearch?: string;
  filters?: Record<string, unknown>;
  rowKey?: (row: T, index: number) => string | number;
  toolbar?: ReactNode;
  emptyState?: ReactNode;
  className?: string;
  pageSizeOptions?: number[];
  autoFocusSearch?: boolean;
  manualRefreshKey?: unknown; // change to force refetch
};

function useDebounced<T>(value: T, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function formatRange(page: number, pageSize: number, total: number) {
  if (total === 0) return "0";
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return `${start}-${end}`;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  fetchData,
  initialPageSize = 10,
  initialSort,
  initialSearch = "",
  filters,
  rowKey,
  toolbar,
  emptyState,
  className,
  pageSizeOptions = [5, 10, 20, 50, 100],
  autoFocusSearch = false,
  manualRefreshKey,
}: DataTableProps<T>) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sortKey, setSortKey] = useState<string | undefined>(initialSort?.key);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | undefined>(
    initialSort?.order
  );
  const [search, setSearch] = useState(initialSearch);
  const debouncedSearch = useDebounced(search, 500);

  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const filtersKey = useMemo(() => JSON.stringify(filters ?? {}), [filters]);

  useEffect(() => {
    if (autoFocusSearch && searchRef.current) {
      searchRef.current.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / Math.max(1, pageSize))),
    [total, pageSize]
  );

  const doFetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchData({
        page,
        pageSize,
        sortKey,
        sortOrder,
        search: debouncedSearch?.trim() || undefined,
        filters,
      });
      setRows(res.rows);
      setTotal(res.total);
    } catch (e: any) {
      setError(e?.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [fetchData, page, pageSize, sortKey, sortOrder, debouncedSearch, filters]);

  useEffect(() => {
    // Reset to first page when search or filters change
    if (page !== 1) {
      setPage(1);
    }
  }, [debouncedSearch, filtersKey, page]);

  useEffect(() => {
    void doFetch();
  }, [doFetch, manualRefreshKey]);

  const onHeaderClick = (col: DataTableColumn<T>) => {
    if (!col.sortable) return;
    if (sortKey !== col.key) {
      setSortKey(col.key);
      setSortOrder("asc");
      return;
    }
    // toggle asc -> desc -> off
    if (sortOrder === "asc") setSortOrder("desc");
    else if (sortOrder === "desc") {
      setSortKey(undefined);
      setSortOrder(undefined);
    } else setSortOrder("asc");
  };

  const currentRange = formatRange(page, pageSize, total);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {error && <div className="text-sm text-destructive">{error}</div>}
        <div className="flex items-center gap-2 w-full sm:w-80">
          <div className="relative w-full">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari..."
              className="pl-8"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => doFetch()}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
        {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="relative">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                {columns.map((col) => {
                  const isActive = sortKey === col.key;
                  return (
                    <TableHead
                      key={col.key}
                      style={col.width ? { width: col.width } : undefined}
                      className={cn(
                        col.className,
                        col.sortable && "cursor-pointer select-none",
                        col.align === "center" && "text-center",
                        col.align === "right" && "text-right"
                      )}
                      onClick={() => onHeaderClick(col)}
                    >
                      <div
                        className={cn(
                          "flex items-center gap-1",
                          col.align === "right" && "justify-end",
                          col.align === "center" && "justify-center"
                        )}
                      >
                        <span>{col.header}</span>
                        {col.sortable && (
                          <span className="inline-flex h-4 w-4 items-center justify-center">
                            {isActive ? (
                              sortOrder === "asc" ? (
                                <ArrowUp className="h-3.5 w-3.5" />
                              ) : sortOrder === "desc" ? (
                                <ArrowDown className="h-3.5 w-3.5" />
                              ) : null
                            ) : (
                              <ArrowUp className="h-3.5 w-3.5 opacity-30" />
                            )}
                          </span>
                        )}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && rows.length === 0 ? (
                [...Array(Math.min(pageSize, 5))].map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    <TableCell colSpan={columns.length}>
                      <div className="flex items-center gap-2 py-3 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Memuat data...
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length}>
                    <div className="py-6 text-center text-muted-foreground">
                      {emptyState ?? "Tidak ada data"}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, idx) => (
                  <TableRow key={String(rowKey?.(row, idx) ?? idx)}>
                    {columns.map((col) => (
                      <TableCell
                        key={col.key}
                        className={cn(
                          col.align === "center" && "text-center",
                          col.align === "right" && "text-right"
                        )}
                      >
                        {col.cell
                          ? col.cell(row, idx)
                          : String(row[col.key] ?? "-")}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-2 border-t p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Menampilkan {currentRange} dari {total} data
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Baris:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  const size = Number(val);
                  setPage(1);
                  setPageSize(size);
                }}
              >
                <SelectTrigger className="w-22">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((opt) => (
                    <SelectItem key={opt} value={String(opt)}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setPage((p) => Math.max(1, p - 1));
                    }}
                  />
                </PaginationItem>
                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  // simple windowing around current page
                  let start = Math.max(1, page - 2);
                  const end = Math.min(totalPages, start + 4);
                  start = Math.max(1, end - 4);
                  const pageNum = start + i;
                  if (pageNum > end) return null;
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        href="#"
                        isActive={pageNum === page}
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(pageNum);
                        }}
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setPage((p) => Math.min(totalPages, p + 1));
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataTable;
