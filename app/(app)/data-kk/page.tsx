"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Eye, Users as UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePermissions } from "@/hooks/use-permissions";
import { DetailKKModal } from "@/components/modals/DetailKKModal";
import {
  DataTable,
  DataTableColumn,
  DataTableFetchParams,
  DataTableFetchResult,
} from "@/components/ui/data-table";
import {
  EMPTY_FILTERS,
  KkCompositionChips,
  KkFilterBar,
  KkFlagBadges,
  KkSummaryStrip,
  ExportMenu,
  RevealToggle,
  hasActiveFilter,
  type KkFilters,
} from "@/components/app/kependudukan/KkListParts";
import {
  KK_HAS,
  KK_PRESETS,
  KK_SIZES,
  spacedDigits,
  type KkHas,
  type KkListRow,
  type KkPreset,
  type KkSize,
  type KkSummary,
} from "@/lib/kependudukan/kk-list";

type AnggotaKeluarga = {
  id: number;
  name: string;
  id_number: string;
  gender: "M" | "F";
  birthplace: string;
  date_of_birth: string;
  religion_id: number;
  education_id: number;
  job_id: number;
  marital_status: string;
  status_family: string;
  is_live: string;
  is_active?: boolean;
  role: string;
};

type KartuKeluargaDetail = {
  id: string;
  /** Pegangan buram untuk membuka detail dan Pecah KK tanpa nomor KK. */
  ref: number;
  /** Tersamar, kecuali admin sudah menampilkan nomor lengkap. */
  family_card_number: string;
  revealed?: boolean;
  canFull?: boolean;
  kepalaKeluarga: string;
  alamat: string;
  rt: string;
  rw: string;
  hamlet: string;
  jumlahAnggota: number;
  anggotaKeluarga: AnggotaKeluarga[];
};

const FILTER_KEYS = ["dusun", "rw", "rt", "size", "has", "preset"] as const;
const pick = <T extends string>(list: readonly T[], v: string | null): T | "" => (v && (list as readonly string[]).includes(v) ? (v as T) : "");

function DataKKContent() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [selectedKK, setSelectedKK] = useState<KartuKeluargaDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { can } = usePermissions();
  // Naik setelah KK dipecah dan modal ditutup: daftar dimuat ulang (jumlah anggota berubah, mungkin ada KK baru).
  const [listVersion, setListVersion] = useState(0);
  const changedRef = useRef(false);

  const [summary, setSummary] = useState<KkSummary | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [canFull, setCanFull] = useState(false);
  // Nomor lengkap hanya di memori halaman ini (tidak disimpan di URL/penyimpanan), selalu mulai dari tersamar.
  const [reveal, setReveal] = useState(false);
  const [exporting, setExporting] = useState(false);
  // Parameter permintaan daftar terakhir: ekspor memakai filter, urutan, dan pencarian yang sedang tampil.
  const lastParamsRef = useRef<DataTableFetchParams | null>(null);

  // Filter hidup di URL (bisa dibagikan, tombol Back mempertahankannya).
  const dusun = sp.get("dusun") ?? "";
  const rw = sp.get("rw") ?? "";
  const rt = sp.get("rt") ?? "";
  const size = pick<KkSize>(KK_SIZES, sp.get("size"));
  const has = pick<KkHas>(KK_HAS, sp.get("has"));
  const preset = pick<KkPreset>(KK_PRESETS, sp.get("preset"));
  const urlFilters = useMemo<KkFilters>(() => ({ dusun, rw, rt, size, has, preset }), [dusun, rw, rt, size, has, preset]);
  const tableFilters = useMemo(() => ({ ...urlFilters, full: reveal }), [urlFilters, reveal]);

  const setFilters = useCallback(
    (patch: Partial<KkFilters>) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, String(v));
        else next.delete(k);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [sp, router, pathname],
  );

  const loadSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/kk/ringkasan");
      if (res.ok) setSummary((await res.json()) as KkSummary);
    } catch {
      // Ringkasan hanya pelengkap: tabel tetap bekerja tanpa ini.
    }
  }, []);
  useEffect(() => {
    void loadSummary();
  }, [loadSummary, listVersion]);

  const fetchKK = useCallback(async (params: DataTableFetchParams): Promise<DataTableFetchResult<KkListRow>> => {
    lastParamsRef.current = params;
    const url = new URL("/api/kk", window.location.origin);
    url.searchParams.set("page", String(params.page));
    url.searchParams.set("pageSize", String(params.pageSize));
    if (params.sortKey) url.searchParams.set("sortKey", params.sortKey);
    if (params.sortOrder) url.searchParams.set("sortOrder", params.sortOrder);
    if (params.search) url.searchParams.set("search", params.search);
    const f = params.filters ?? {};
    for (const k of FILTER_KEYS) if (f[k]) url.searchParams.set(k, String(f[k]));
    if (f.full) url.searchParams.set("full", "1");

    const res = await fetch(url.toString(), { method: "GET" });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      throw new Error(typeof j?.error === "string" ? j.error : "Gagal memuat data KK");
    }
    const data = (await res.json()) as DataTableFetchResult<KkListRow> & { canFull?: boolean };
    setCanFull(Boolean(data.canFull));
    setTotal(data.total);
    return { rows: data.rows, total: data.total };
  }, []);

  const handleViewDetail = useCallback(async (ref: number, full = false) => {
    try {
      const res = await fetch(`/api/kk/${ref}${full ? "?full=1" : ""}`);
      if (!res.ok) throw new Error("Gagal memuat detail KK");
      const data = await res.json();
      setSelectedKK(data as KartuKeluargaDetail);
      setIsModalOpen(true);
    } catch (e) {
      console.error(e);
      toast.error("Detail KK tidak bisa dimuat. Coba lagi.");
    }
  }, []);

  // Setelah KK dipecah, `ref` lama bisa menunjuk anggota yang kini di KK baru: muat ulang lewat anggota yang tetap tinggal.
  const handleSplitDone = useCallback(
    async (info?: { movedIds: number[] }) => {
      changedRef.current = true;
      if (!selectedKK) return;
      const moved = new Set(info?.movedIds ?? []);
      const stayer = selectedKK.anggotaKeluarga.find((a) => !moved.has(a.id));
      await handleViewDetail(stayer?.id ?? selectedKK.ref);
    },
    [selectedKK, handleViewDetail],
  );

  const exportList = useCallback(async (format: "excel" | "csv") => {
    const p = lastParamsRef.current;
    const url = new URL("/api/kk/export", window.location.origin);
    url.searchParams.set("format", format);
    if (p?.sortKey) url.searchParams.set("sortKey", p.sortKey);
    if (p?.sortOrder) url.searchParams.set("sortOrder", p.sortOrder);
    if (p?.search) url.searchParams.set("search", p.search);
    const f = p?.filters ?? {};
    for (const k of FILTER_KEYS) if (f[k]) url.searchParams.set(k, String(f[k]));
    setExporting(true);
    try {
      const res = await fetch(url.toString());
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(typeof j?.error === "string" ? j.error : "Gagal mengunduh daftar KK");
      }
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? `daftar-kk.${format === "csv" ? "csv" : "xlsx"}`;
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
      toast.success("Daftar KK diunduh. Berkas memuat nomor KK lengkap; simpan dengan hati-hati.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengunduh daftar KK");
    } finally {
      setExporting(false);
    }
  }, []);

  const toggleReveal = useCallback(() => {
    // Efek samping (toast) tidak boleh di dalam updater setState: StrictMode memanggilnya dua kali.
    if (!reveal) toast.message("Nomor KK lengkap ditampilkan. Tindakan ini dicatat di jejak audit.");
    setReveal(!reveal);
  }, [reveal]);

  const columns = useMemo<DataTableColumn<KkListRow>[]>(
    () => [
      {
        key: "family_card_number",
        header: "No. Kartu Keluarga",
        sortable: true,
        className: "font-mono text-xs",
        cell: (row) => <span className="whitespace-nowrap">{row.kk ? spacedDigits(row.kk) : row.kkMasked}</span>,
      },
      {
        key: "kepalaKeluarga",
        header: "Kepala Keluarga",
        sortable: true,
        className: "font-medium min-w-32",
        cell: (row) => <span className="block max-w-[13rem] whitespace-normal break-words">{row.kepalaKeluarga}</span>,
      },
      {
        key: "alamat",
        header: "Alamat",
        sortable: true,
        className: "text-sm min-w-36",
        cell: (row) => <span className="block max-w-[14rem] whitespace-normal break-words">{row.alamat}</span>,
      },
      {
        key: "rt_rw",
        header: "RT/RW",
        sortable: true,
        cell: (row) => (
          <Badge variant="outline">
            {row.rt}/{row.rw}
          </Badge>
        ),
      },
      { key: "hamlet", header: "Dusun", sortable: true, className: "text-sm", cell: (row) => row.hamlet },
      {
        key: "jumlahAnggota",
        header: "Anggota Aktif",
        sortable: true,
        cell: (row) => (
          <div className="flex flex-col items-start gap-1">
            <Badge className="bg-primary/10 text-primary hover:bg-primary/20 tabular-nums">
              <UsersIcon aria-hidden="true" className="h-3 w-3 mr-1" />
              {row.jumlahAnggota} Orang
            </Badge>
            {row.tidakAktif > 0 ? (
              <span className="text-xs text-muted-foreground">+{row.tidakAktif} meninggal/pindah</span>
            ) : null}
          </div>
        ),
      },
      {
        key: "komposisi",
        header: "Komposisi",
        className: "min-w-36",
        cell: (row) => <KkCompositionChips komposisi={row.komposisi} />,
      },
      {
        key: "flags",
        header: "Perlu dicek",
        className: "min-w-36",
        cell: (row) => <KkFlagBadges flags={row.flags} />,
      },
      {
        key: "actions",
        header: "Aksi",
        align: "right",
        cell: (row) => (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-primary hover:text-primary hover:bg-primary/10"
              aria-label={`Lihat detail KK ${row.kepalaKeluarga}`}
              title="Lihat detail"
              onClick={() => handleViewDetail(row.ref)}
            >
              <Eye aria-hidden="true" className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [handleViewDetail],
  );

  return (
    <div className="space-y-6">
      <KkSummaryStrip summary={summary} preset={preset} onPreset={(p) => setFilters({ preset: p })} />

      <KkFilterBar summary={summary} filters={urlFilters} onChange={setFilters} />

      {/* DataTable */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Kartu Keluarga</CardTitle>
          <p role="status" className="sr-only">
            {total == null ? "Memuat daftar KK" : `${total} KK ditemukan`}
          </p>
        </CardHeader>
        <CardContent>
          <DataTable<KkListRow>
            key={listVersion}
            columns={columns}
            fetchData={fetchKK}
            filters={tableFilters}
            initialPageSize={10}
            initialSort={{ key: "family_card_number", order: "asc" }}
            rowKey={(r) => r.ref}
            toolbar={
              canFull ? (
                <div className="flex flex-wrap items-center gap-2">
                  <RevealToggle on={reveal} onToggle={toggleReveal} />
                  <ExportMenu busy={exporting} onExport={(f) => void exportList(f)} />
                </div>
              ) : undefined
            }
            emptyState={
              hasActiveFilter(urlFilters) ? (
                <div className="flex flex-col items-center gap-2">
                  <span>Tidak ada KK yang cocok dengan filter ini.</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>
                    Hapus semua filter
                  </Button>
                </div>
              ) : undefined
            }
          />
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedKK && (
        <DetailKKModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedKK(null);
            if (changedRef.current) {
              changedRef.current = false;
              setListVersion((v) => v + 1);
            }
          }}
          kkData={selectedKK}
          canSplit={can("residents", "update")}
          canReveal={Boolean(selectedKK.canFull)}
          onReveal={(full) => void handleViewDetail(selectedKK.ref, full)}
          onChanged={(info) => void handleSplitDone(info)}
        />
      )}
    </div>
  );
}

export default function DataKK() {
  // useSearchParams (filter di URL) mewajibkan batas Suspense.
  return (
    <Suspense fallback={null}>
      <DataKKContent />
    </Suspense>
  );
}
