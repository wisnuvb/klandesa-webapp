"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Clock, Download, Plus, XCircle, Ban, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AsyncState } from "@/components/app/patterns";
import { MUTATION_LABEL, type MutationType } from "@/lib/kependudukan/mutation";
import { describeMutation, formatTanggal, MUTASI_TYPES, STATUS_META, type MutasiItemView, type MutasiStatus } from "@/lib/kependudukan/mutasi-labels";
import { useMutasi } from "../_hooks/useMutasi";
import { DecideDialog, type Decision } from "./DecideDialog";
import { MutasiFormDialog } from "./MutasiFormDialog";
import { SearchSelect } from "@/components/ui/search-select";

const STATUS_ICON: Record<MutasiStatus, typeof Clock> = { PENDING: Clock, APPLIED: CheckCircle2, REJECTED: XCircle, CANCELLED: Ban };
const STATUS_STYLE: Record<MutasiStatus, string> = {
  PENDING: "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50",
  APPLIED: "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-50",
  REJECTED: "border-red-300 bg-red-50 text-red-950 dark:border-red-700 dark:bg-red-950 dark:text-red-50",
  CANCELLED: "border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50",
};

function Chip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count?: number }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-11 rounded-full border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
      }`}
    >
      {label}
      {count ? ` (${count})` : ""}
    </button>
  );
}

function MutasiCard({ item, canDecide, canSubmit, busyId, onDecide, onCancel }: { item: MutasiItemView; canDecide: boolean; canSubmit: boolean; busyId: string | null; onDecide: (d: Decision) => void; onCancel: (id: string) => void }) {
  const Icon = STATUS_ICON[item.status];
  const pending = item.status === "PENDING";
  return (
    <article className="space-y-3 rounded-lg border bg-card p-4" aria-label={describeMutation(item)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            {MUTATION_LABEL[item.type]} · {formatTanggal(item.effectiveDate)}
          </p>
          <h3 className="text-base font-semibold">{describeMutation(item)}</h3>
          {item.residentNikLast4 ? <p className="text-sm text-muted-foreground">NIK ••••{item.residentNikLast4}{item.rt || item.rw ? ` · RT ${item.rt ?? "-"}/RW ${item.rw ?? "-"}` : ""}</p> : null}
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${STATUS_STYLE[item.status]}`}>
          <Icon aria-hidden="true" className="size-4" />
          {STATUS_META[item.status].label}
        </span>
      </div>

      <p className="text-sm text-muted-foreground">
        {item.requestedBy ? `Diajukan oleh ${item.requestedBy}` : item.source === "legacy_edit" ? "Tercatat otomatis dari perubahan Data Warga" : item.source === "import" ? "Tercatat otomatis dari impor" : "Diajukan"}
        {item.decidedBy ? ` · Diputuskan oleh ${item.decidedBy}` : ""}
      </p>
      {item.rejectionReason ? <p className="rounded-md bg-muted p-3 text-sm">Alasan ditolak: {item.rejectionReason}</p> : null}

      {pending && (canDecide || canSubmit) ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {canDecide ? (
            <>
              <Button type="button" className="min-h-11" disabled={busyId === item.id} onClick={() => onDecide({ item, mode: "approve" })}>
                Setujui
              </Button>
              <Button type="button" variant="outline" className="min-h-11" disabled={busyId === item.id} onClick={() => onDecide({ item, mode: "reject" })}>
                Tolak
              </Button>
            </>
          ) : null}
          {canSubmit ? (
            <Button type="button" variant="ghost" className="min-h-11" disabled={busyId === item.id} onClick={() => onCancel(item.id)}>
              Batalkan pengajuan
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function MutasiView() {
  const m = useMutasi();
  const [formOpen, setFormOpen] = useState(false);
  const [decision, setDecision] = useState<Decision>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const canSubmit = m.data?.permissions.canSubmit ?? false;
  const canDecide = m.data?.permissions.canDecide ?? false;
  const year = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link href="/data-warga" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground underline-offset-2 hover:underline">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Kembali ke Data Warga
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Buku Mutasi Penduduk</h1>
            <p className="max-w-prose text-muted-foreground">
              Catatan kelahiran, kematian, pindah, datang, dan ganti KK. Pengajuan baru mengubah data warga setelah disetujui pejabat desa.
            </p>
          </div>
          {canSubmit ? (
            <Button type="button" size="lg" className="min-h-11" onClick={() => setFormOpen(true)}>
              <Plus aria-hidden="true" />
              Catat mutasi
            </Button>
          ) : null}
        </div>
      </header>

      {m.off ? (
        <div className="flex gap-3 rounded-lg border bg-card p-6">
          <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <div className="space-y-1">
            <h2 className="font-semibold">Fitur ini belum diaktifkan untuk desa Anda</h2>
            <p className="text-sm text-muted-foreground">Buku mutasi dinyalakan bertahap oleh tim Klandesa setelah data KK desa diperiksa. Hubungi kami bila ingin memakainya lebih awal.</p>
          </div>
        </div>
      ) : (
        <AsyncState loading={m.loading && !m.data} error={m.error} onRetry={m.reload} loadingMessage="Memuat buku mutasi…" minHeight="40vh">
          {m.data ? (
            <>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <nav aria-label="Saring menurut status">
                  <ul className="flex flex-wrap gap-2">
                    <li>
                      <Chip active={m.status === "PENDING"} onClick={() => m.selectStatus("PENDING")} label="Menunggu keputusan" count={m.pending} />
                    </li>
                    <li>
                      <Chip active={m.status === "APPLIED"} onClick={() => m.selectStatus("APPLIED")} label="Sudah diterapkan" />
                    </li>
                    <li>
                      <Chip active={m.status === "ALL"} onClick={() => m.selectStatus("ALL")} label="Semua" />
                    </li>
                  </ul>
                </nav>
                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor="mutasi-filter-jenis" className="text-sm text-muted-foreground">
                    Jenis
                  </label>
                  <SearchSelect
                    id="mutasi-filter-jenis"
                    className="h-11 rounded-md border border-input bg-input-background px-3 text-base md:text-sm"
                    value={m.type}
                    onChange={(e) => m.selectType(e.target.value as MutationType | "ALL")}
                  >
                    <option value="ALL">Semua jenis</option>
                    {MUTASI_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {MUTATION_LABEL[t]}
                      </option>
                    ))}
                  </SearchSelect>
                  <Button asChild variant="outline" className="min-h-11">
                    <a href={`/api/kependudukan/laporan/mutasi?format=csv&from=${year}-01-01&to=${year}-12-31`}>
                      <Download aria-hidden="true" />
                      Unduh rekap {year}
                    </a>
                  </Button>
                </div>
              </div>

              {m.data.items.length === 0 ? (
                <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                  {m.status === "PENDING" ? "Tidak ada pengajuan yang menunggu keputusan." : "Belum ada catatan mutasi untuk pilihan ini."}
                </p>
              ) : (
                <ul className="space-y-3">
                  {m.data.items.map((item) => (
                    <li key={item.id}>
                      <MutasiCard
                        item={item}
                        canDecide={canDecide}
                        canSubmit={canSubmit}
                        busyId={busyId}
                        onDecide={setDecision}
                        onCancel={async (id) => {
                          setBusyId(id);
                          const r = await m.cancel(id);
                          setBusyId(null);
                          if (!r.ok) toast.error(r.errors[0]);
                        }}
                      />
                    </li>
                  ))}
                </ul>
              )}

              {m.canLoadMore ? (
                <div className="flex justify-center">
                  <Button type="button" variant="outline" className="min-h-11" onClick={m.loadMore}>
                    Tampilkan lebih banyak
                  </Button>
                </div>
              ) : null}
            </>
          ) : null}
        </AsyncState>
      )}

      <p role="status" aria-live="polite" className="sr-only">
        {m.announcement}
      </p>

      {formOpen ? <MutasiFormDialog open onOpenChange={setFormOpen} onSubmit={m.submit} /> : null}
      <DecideDialog key={decision ? `${decision.item.id}-${decision.mode}` : "none"} decision={decision} onClose={() => setDecision(null)} onApprove={m.approve} onReject={m.reject} />
    </div>
  );
}
