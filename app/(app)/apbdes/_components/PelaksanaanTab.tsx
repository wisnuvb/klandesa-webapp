"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApiGet } from "@/hooks/useApiGet";
import { PLAN_STATUS } from "@/lib/apbdes/catalog";
import type { ActivityPlanView } from "@/lib/apbdes/dpa";
import { DpaDialog } from "./DpaDialog";
import { money, type Overview } from "./shared";

interface Data {
  activeLabel: string | null;
  activities: ActivityPlanView[];
}

/** Dokumen Pelaksanaan Anggaran per kegiatan (Pasal 45-48). */
export function PelaksanaanTab({ o, reload }: { o: Overview; reload: () => void }) {
  const { data, loading, error, reload: reloadList } = useApiGet<Data>(`/api/apbdes/dpa?year=${o.year}`);
  const [open, setOpen] = useState<string | null>(null);
  const changed = () => { reloadList(); reload(); };
  const current = data?.activities.find((a) => a.activityCode === open) ?? null;

  return (
    <div className="space-y-4">
      <p className="max-w-prose text-sm text-muted-foreground">
        Setiap kegiatan di APB Desa punya DPA: rencana kerja, rencana penarikan per bulan (dasar RAK Desa), dan RAB. DPA yang sudah disetujui Kepala Desa menjadi syarat mengajukan SPP.
      </p>
      {data?.activities.length ? (
        <div className="flex flex-wrap gap-2">
          <a className="inline-flex min-h-11 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent" href={`/apbdes/cetak?kind=rkk&year=${o.year}`}>Cetak Rencana Kerja Kegiatan</a>
          <a className="inline-flex min-h-11 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent" href={`/apbdes/cetak?kind=rak&year=${o.year}`}>Cetak RAK Desa</a>
        </div>
      ) : null}
      {loading ? <p role="status" className="flex items-center gap-2 text-muted-foreground"><Loader2 aria-hidden="true" className="size-4 animate-spin" />Memuat…</p> : null}
      {error ? <p role="alert" className="text-destructive">{error}</p> : null}
      {data && !data.activeLabel ? <p className="rounded-lg border border-dashed p-8 text-center">APB Desa {o.year} belum ditetapkan. DPA disusun setelah APB Desa ditetapkan.</p> : null}
      {data?.activeLabel && data.activities.length === 0 ? <p className="rounded-lg border border-dashed p-8 text-center">APB Desa belum memuat belanja per kegiatan.</p> : null}
      {data?.activities.length ? (
        <ul className="space-y-3">
          {data.activities.map((a) => (
            <li key={a.activityCode} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <h2 className="break-words font-semibold">{a.activityCode} {a.name}</h2>
                  <p className="text-sm">Anggaran {money(a.budget)} · {PLAN_STATUS[a.status]}{a.executorName ? ` · pelaksana ${a.executorName}` : ""}</p>
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    {a.rakComplete ? <CheckCircle2 aria-hidden="true" className="size-4 text-emerald-700" /> : <Circle aria-hidden="true" className="size-4" />}
                    Rencana penarikan {a.rakComplete ? "lengkap" : "belum sama dengan anggaran"} · {a.costItems.length} baris RAB
                  </p>
                  {a.needsRevision ? <p className="text-sm text-amber-800 dark:text-amber-300">Anggaran berubah sejak disetujui: perlu DPPA.</p> : null}
                </div>
                <Button type="button" variant={a.status === "DRAFT" ? "default" : "outline"} className="min-h-11" onClick={() => setOpen(a.activityCode)} aria-label={`Kelola DPA ${a.name}`}>
                  {a.status === "DRAFT" ? "Susun DPA" : "Lihat DPA"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {current ? <DpaDialog key={current.activityCode} o={o} plan={current} onClose={() => setOpen(null)} onChanged={changed} /> : null}
    </div>
  );
}
