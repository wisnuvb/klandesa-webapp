"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ExternalLink, MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiJson } from "@/components/admin/security/api";
import { PROGRESS_LABELS, PROGRESS_STATUSES } from "@/lib/aspirasi/catalog";
import { AspirationCard } from "./AspirationCard";
import { ClaimPanel } from "./ClaimPanel";
import { publicAreaPath, type DashboardData } from "./types";

const PAGE_SIZE = 20;

export function AspirasiPublikView() {
  const params = useSearchParams();
  const prefillSlug = params.get("klaim");
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>("");
  const [page, setPage] = useState(1);
  const seq = useRef(0);

  const load = useCallback(async (p: string, pg: number) => {
    const my = ++seq.current;
    try {
      const q = new URLSearchParams();
      if (p) q.set("progress", p);
      if (pg > 1) q.set("page", String(pg));
      const r = await apiJson<DashboardData>(`/api/aspirasi-publik${q.size ? `?${q}` : ""}`);
      if (my === seq.current) {
        setData(r);
        setError(null);
      }
    } catch (e) {
      if (my === seq.current) setError(e instanceof Error ? e.message : "Gagal memuat aspirasi.");
    }
  }, []);
  useEffect(() => {
    // Muat ulang saat saringan/halaman berubah; state baru diisi sesudah await (urutan dijaga seq).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(progress, page);
  }, [load, progress, page]);

  const refresh = () => void load(progress, page);

  if (error && !data) {
    return (
      <div className="mx-auto w-full max-w-4xl p-4 md:p-6">
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/40 p-4 text-sm text-destructive">
          {error}
          <Button size="sm" variant="outline" onClick={refresh}>
            Coba lagi
          </Button>
        </div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-3 p-4 md:p-6" aria-busy="true">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const managed = data.area != null;
  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const allCount = Object.values(data.counts).reduce((s, n) => s + n, 0);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <MessagesSquare className="h-6 w-6" aria-hidden="true" />
          Aspirasi Publik
        </h1>
        <p className="text-sm text-muted-foreground">
          Laporan warga tentang kondisi desa yang tampil terbuka di klandesa.com. Identitas pelapor tidak ditampilkan dan tidak dibagikan kepada desa. Tanggapan Anda tampil publik atas nama Pemerintah Desa.
        </p>
      </header>

      {!managed ? (
        <ClaimPanel data={data} prefillSlug={prefillSlug} onSubmitted={refresh} />
      ) : (
        <>
          {data.claim?.status === "APPROVED" || data.area ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3 text-sm">
              <p>
                Wilayah yang Anda kelola: <strong>{data.area!.name}</strong>, Kec. {data.area!.district}, {data.area!.regency}.
              </p>
              <Button asChild variant="outline" size="sm" className="min-h-10">
                <a href={publicAreaPath(data.area!.slug)} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                  Halaman publik desa
                </a>
              </Button>
            </div>
          ) : null}

          <div role="group" aria-label="Saring menurut status tindak lanjut" className="flex flex-wrap gap-2">
            <FilterChip active={progress === ""} onClick={() => { setProgress(""); setPage(1); }} label="Semua" count={allCount} />
            {PROGRESS_STATUSES.map((s) => (
              <FilterChip key={s} active={progress === s} onClick={() => { setProgress(s); setPage(1); }} label={PROGRESS_LABELS[s]} count={data.counts[s] ?? 0} />
            ))}
          </div>

          <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
            {data.total} laporan{progress ? ` berstatus "${PROGRESS_LABELS[progress as keyof typeof PROGRESS_LABELS]}"` : " tayang"}.
          </p>

          {error ? (
            <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/40 p-3 text-sm text-destructive">
              {error}
              <Button size="sm" variant="outline" onClick={refresh}>
                Coba lagi
              </Button>
            </div>
          ) : null}

          {data.items.length === 0 ? (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              {progress ? "Tidak ada laporan dengan status ini." : "Belum ada laporan warga yang tayang untuk wilayah Anda. Kami akan memberi tahu lewat lonceng notifikasi saat ada yang baru."}
            </p>
          ) : (
            <ul className="space-y-3">
              {data.items.map((it) => (
                <AspirationCard key={it.code} item={it} villageName={data.village.name} canReply={data.can.create} canDelete={data.can.delete} onChanged={refresh} />
              ))}
            </ul>
          )}

          {totalPages > 1 ? (
            <nav aria-label="Halaman laporan" className="flex items-center justify-center gap-3">
              <Button variant="outline" className="min-h-11" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Sebelumnya
              </Button>
              <span className="text-sm tabular-nums">
                Halaman {page} dari {totalPages}
              </span>
              <Button variant="outline" className="min-h-11" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Berikutnya
              </Button>
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-11 cursor-pointer rounded-full border px-4 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}
    >
      {label} <span className="tabular-nums opacity-80">({count})</span>
    </button>
  );
}
