"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePermissions } from "@/hooks/use-permissions";
import { ExportPermohonanModal } from "@/components/app/permohonan-warga/ExportPermohonanModal";
import { NlSearch } from "@/components/app/permohonan-warga/NlSearch";
import { EMPTY_FILTERS, filtersToParams, isFiltered, RequestFilters, type FilterState } from "@/components/app/permohonan-warga/RequestFilters";
import { RequestDetailDialog } from "@/components/app/permohonan-warga/RequestDetailDialog";
import { RequestTable } from "@/components/app/permohonan-warga/RequestTable";
import { readApiError, type QueueRow, type QueueStats } from "@/components/app/permohonan-warga/shared";
import { SmartProcessDialog } from "@/components/app/permohonan-warga/SmartProcessDialog";
import { StatsStrip, type QuickView } from "@/components/app/permohonan-warga/StatsStrip";

const PAGE_SIZE = 15;

function quickViewOf(f: FilterState): QuickView {
  if (f.queue === "siap" || f.queue === "menunggu_rt" || f.queue === "lama") return f.queue;
  if (f.status === "SELESAI" && !f.queue) return "SELESAI";
  return "all";
}

export function PermohonanWarga() {
  const { can } = usePermissions();
  const canDecide = can("mail", "update");

  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [search, setSearch] = useState(""); // nilai yang sudah ditunda (debounce) dari filters.search
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [showSmart, setShowSmart] = useState(false);
  const needStats = useRef(true);

  // Pencarian ditunda 350 ms agar tidak memanggil API di tiap ketukan.
  useEffect(() => {
    const t = setTimeout(() => setSearch(filters.search), 350);
    return () => clearTimeout(t);
  }, [filters.search]);

  const query = useMemo(() => {
    const p = filtersToParams({ ...filters, search });
    p.set("page", String(page));
    p.set("pageSize", String(PAGE_SIZE));
    return p.toString();
  }, [filters, search, page]);

  // `isStale` = hasil permintaan ini sudah tidak dibutuhkan (filter berganti atau halaman ditinggalkan).
  // Sengaja TIDAK memakai AbortController: `abort()` di cleanup efek memunculkan "AbortError: signal is
  // aborted without reason" di overlay galat Next saat pindah halaman. Respons basi cukup diabaikan.
  const fetchData = useCallback(
    async (isStale: () => boolean = () => false) => {
      setLoading(true);
      setError(null);
      // Statistik berlaku untuk seluruh data, jadi cukup diminta saat awal dan setelah ada keputusan; pindah halaman/filter tidak.
      const withStats = needStats.current;
      try {
        const res = await fetch(`/api/mail-requests?${query}${withStats ? "" : "&stats=0"}`);
        if (!res.ok) throw new Error(await readApiError(res, "Gagal memuat data"));
        const data = (await res.json()) as { rows: QueueRow[]; total: number; stats: QueueStats | null };
        if (isStale()) return;
        setRows(data.rows);
        setTotal(data.total);
        if (data.stats) setStats(data.stats);
        if (withStats && data.stats) needStats.current = false;
      } catch (e) {
        if (isStale()) return;
        setError(e instanceof Error ? e.message : "Terjadi kesalahan");
      } finally {
        if (!isStale()) setLoading(false);
      }
    },
    [query],
  );

  useEffect(() => {
    let stale = false;
    void fetchData(() => stale);
    return () => {
      stale = true;
    };
  }, [fetchData]);

  const patchFilters = useCallback((patch: Partial<FilterState>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }, []);

  const refreshAll = useCallback(() => {
    needStats.current = true;
    void fetchData();
  }, [fetchData]);

  const pickQuick = (v: QuickView) => {
    if (v === "all") patchFilters({ status: "all", queue: "" });
    else if (v === "SELESAI") patchFilters({ status: "SELESAI", queue: "" });
    else patchFilters({ status: "all", queue: v });
  };

  return (
    <div className="space-y-5">
      <StatsStrip stats={stats} active={quickViewOf(filters)} onPick={pickQuick} />

      <RequestFilters
        value={filters}
        onChange={patchFilters}
        jenis={stats?.jenis ?? []}
        onExport={() => setShowExport(true)}
        extra={
          canDecide ? (
            <Button className="gap-2 bg-violet-700 hover:bg-violet-800" onClick={() => setShowSmart(true)} disabled={(stats?.siap ?? 0) === 0}>
              <Sparkles className="h-4 w-4" aria-hidden /> Proses Cerdas
            </Button>
          ) : null
        }
      />

      {canDecide ? (
        <Card>
          <CardContent className="p-4">
            <NlSearch onApply={(f) => { setFilters(f); setSearch(f.search); setPage(1); }} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Daftar Permohonan Surat</CardTitle>
        </CardHeader>
        <CardContent>
          <RequestTable
            rows={rows}
            loading={loading}
            error={error}
            filtered={isFiltered(filters)}
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPage={(p) => setPage(Math.max(1, p))}
            onOpen={(r) => setOpenId(r.id)}
            onRetry={() => void fetchData()}
          />
        </CardContent>
      </Card>

      <RequestDetailDialog id={openId} canDecide={canDecide} onClose={() => setOpenId(null)} onChanged={refreshAll} />

      <SmartProcessDialog
        open={showSmart}
        onOpenChange={setShowSmart}
        onChanged={refreshAll}
        onOpenRequest={(id) => { setShowSmart(false); setOpenId(id); }}
        readyCount={stats?.siap ?? 0}
      />

      <ExportPermohonanModal open={showExport} onOpenChange={setShowExport} currentFilters={{ status: filters.status, search: filters.search, query: filtersToParams(filters).toString() }} />
    </div>
  );
}

export default PermohonanWarga;
