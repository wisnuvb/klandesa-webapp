"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ClipboardCheck, Loader2, Plus, Printer, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApiGet } from "@/hooks/useApiGet";
import { isStatus, KIND_LABEL, OUTCOME_LABEL, SOURCE_LABEL, STATUS_LABEL, STATUSES, TRANSITIONS, type Kind, type Outcome, type Source, type Status } from "@/lib/dtsen/catalog";
import type { ProposalView } from "@/lib/dtsen/service";
import { ProposalFormDialog, SELECT_CLASS } from "./ProposalFormDialog";
import { TransitionDialog } from "./TransitionDialog";

interface ListResponse {
  items: ProposalView[];
  total: number;
  page: number;
  pageSize: number;
  byStatus: Record<string, number>;
  stale: number;
  can: { create: boolean; update: boolean; delete: boolean };
}

const PAGE_SIZE = 25;
const fmt = (d: string | null) => (d ? new Date(`${d}T00:00:00Z`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "-");
const ACTION_LABEL: Partial<Record<Status, string>> = {
  TERVERIFIKASI: "Catat verifikasi",
  DISETUJUI_MUSDES: "Disetujui musdes",
  DITOLAK_MUSDES: "Tidak disetujui musdes",
  DITERUSKAN: "Teruskan ke Dinsos",
  SELESAI: "Catat hasil",
  DIBATALKAN: "Batalkan",
};

export function DtsenView() {
  const [status, setStatus] = useState("");
  const [stale, setStale] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [creating, setCreating] = useState(false);
  const [moving, setMoving] = useState<{ ids: number[]; to: Status } | null>(null);

  const qs = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (status) qs.set("status", status);
  if (stale) qs.set("stale", "1");
  if (search) qs.set("search", search);
  const list = useApiGet<ListResponse>(`/api/dtsen/usulan?${qs}`);
  const d = list.data;
  const pages = d ? Math.max(1, Math.ceil(d.total / d.pageSize)) : 1;

  const chosen = d ? d.items.filter((i) => selected.has(i.id)) : [];
  const commonStatus = chosen.length && chosen.every((i) => i.status === chosen[0].status) ? chosen[0].status : null;
  const nextSteps = commonStatus && isStatus(commonStatus) ? TRANSITIONS[commonStatus] : [];
  const reset = () => { setPage(1); setSelected(new Set()); };
  const toggle = (id: number) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <ClipboardCheck aria-hidden="true" className="size-6" />
            Usulan DTSEN
          </h1>
          <p className="max-w-prose text-muted-foreground">
            Catat warga yang diusulkan masuk, diubah, atau dikeluarkan dari DTSEN, lalu bawa lewat verifikasi lapangan dan musyawarah desa sebelum diteruskan ke Dinas Sosial. Desa tidak menetapkan desil; hasil akhir hanya dicatat.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="min-h-11">
            <Link href="/dtsen/cetak">
              <Printer aria-hidden="true" />
              Daftar untuk musyawarah
            </Link>
          </Button>
          {d?.can.create ? (
            <Button type="button" size="lg" className="min-h-11" onClick={() => setCreating(true)}>
              <Plus aria-hidden="true" />
              Catat usulan
            </Button>
          ) : null}
        </div>
      </header>

      {d && d.stale > 0 ? (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50">
          <AlertTriangle aria-hidden="true" className="size-4 shrink-0" />
          <span>{d.stale} usulan berhenti di satu tahap lebih dari 30 hari.</span>
          <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={() => { setStale(!stale); reset(); }}>
            {stale ? "Tampilkan semua" : "Tampilkan yang mandek"}
          </Button>
        </div>
      ) : null}

      <section aria-label="Penyaring" className="flex flex-wrap items-end gap-3">
        <form onSubmit={(e) => { e.preventDefault(); setSearch(searchInput.trim()); reset(); }} className="flex min-w-60 flex-1 gap-2" role="search">
          <div className="flex-1">
            <label htmlFor="dt-cari" className="sr-only">Cari usulan</label>
            <Input id="dt-cari" className="h-11" value={searchInput} maxLength={100} onChange={(e) => setSearchInput(e.target.value)} placeholder="Cari nama warga, alasan, atau nomor berita acara" />
          </div>
          <Button type="submit" variant="outline" className="min-h-11">
            <Search aria-hidden="true" />
            Cari
          </Button>
        </form>
        <div className="w-full sm:w-72">
          <label htmlFor="dt-f-status" className="sr-only">Tahap</label>
          <select id="dt-f-status" className={SELECT_CLASS} value={status} onChange={(e) => { setStatus(e.target.value); reset(); }}>
            <option value="">Semua tahap</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
                {d?.byStatus[s] ? ` (${d.byStatus[s]})` : ""}
              </option>
            ))}
          </select>
        </div>
      </section>

      {chosen.length > 0 && d?.can.update ? (
        <div role="region" aria-label="Aksi untuk usulan terpilih" className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-lg border bg-background p-3 shadow-sm">
          <p className="mr-2 text-sm font-medium">{chosen.length} dipilih</p>
          {nextSteps.length ? (
            nextSteps.map((to) => (
              <Button key={to} type="button" variant={to === "DIBATALKAN" ? "outline" : "default"} className="min-h-11" onClick={() => setMoving({ ids: chosen.map((c) => c.id), to })}>
                {ACTION_LABEL[to] ?? STATUS_LABEL[to]}
              </Button>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">{commonStatus ? "Usulan pada tahap ini sudah final." : "Pilih usulan yang berada di tahap yang sama untuk memprosesnya bersama."}</p>
          )}
          <Button type="button" variant="ghost" className="min-h-11" onClick={() => setSelected(new Set())}>Lepas pilihan</Button>
        </div>
      ) : null}

      {list.loading ? (
        <p role="status" className="flex items-center gap-2 p-6 text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-5 animate-spin" />
          Memuat usulan…
        </p>
      ) : null}
      {list.error ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          <p>{list.error}</p>
          <Button type="button" variant="outline" className="min-h-11" onClick={list.reload}>Coba lagi</Button>
        </div>
      ) : null}

      {d && d.items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="font-medium">{search || status || stale ? "Tidak ada usulan yang cocok." : "Belum ada usulan DTSEN."}</p>
        </div>
      ) : null}

      {d && d.items.length > 0 ? (
        <ul className="space-y-3">
          {d.items.map((i) => (
            <li key={i.id} className="rounded-lg border bg-card p-4 text-card-foreground">
              <div className="flex items-start gap-3">
                {d.can.update ? (
                  <label className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center">
                    <input type="checkbox" className="size-5" checked={selected.has(i.id)} onChange={() => toggle(i.id)} aria-label={`Pilih usulan ${i.residentName}`} />
                  </label>
                ) : null}
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded border px-2 py-0.5 font-medium">{KIND_LABEL[i.kind as Kind] ?? i.kind}</span>
                    <span className="rounded border px-2 py-0.5">{isStatus(i.status) ? STATUS_LABEL[i.status] : i.status}</span>
                    {i.stale ? (
                      <span className="rounded border border-amber-400 bg-amber-50 px-2 py-0.5 text-amber-950 dark:bg-amber-950 dark:text-amber-50">
                        <AlertTriangle aria-hidden="true" className="mr-1 inline size-3.5" />
                        {i.daysInStatus} hari di tahap ini
                      </span>
                    ) : null}
                  </p>
                  <h2 className="break-words font-semibold">
                    {i.residentName}
                    {i.residentRt || i.residentRw ? <span className="font-normal text-muted-foreground"> · RT {i.residentRt ?? "-"}/RW {i.residentRw ?? "-"}</span> : null}
                  </h2>
                  <p className="text-sm">{i.reason}</p>
                  <p className="text-sm text-muted-foreground">
                    Diusulkan oleh {SOURCE_LABEL[i.source as Source] ?? i.source}
                    {i.knownDesil ? ` · desil yang diketahui: ${i.knownDesil}` : ""}
                  </p>
                </div>
              </div>
              <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                {i.verifiedAt ? <div className="sm:col-span-2"><dt className="inline text-muted-foreground">Verifikasi ({fmt(i.verifiedAt)}, {i.verifiedBy}): </dt><dd className="inline">{i.verificationNote}</dd></div> : null}
                {i.musdesAt ? <div><dt className="inline text-muted-foreground">Musyawarah desa: </dt><dd className="inline">{fmt(i.musdesAt)}, BA {i.musdesRef}</dd></div> : null}
                {i.forwardedAt ? <div><dt className="inline text-muted-foreground">Diteruskan: </dt><dd className="inline">{fmt(i.forwardedAt)}, surat {i.forwardedRef}</dd></div> : null}
                {i.outcome ? <div><dt className="inline text-muted-foreground">Hasil: </dt><dd className="inline">{OUTCOME_LABEL[i.outcome as Outcome] ?? i.outcome} ({fmt(i.outcomeAt)})</dd></div> : null}
                {i.status === "DIBATALKAN" && i.outcomeNote ? <div className="sm:col-span-2"><dt className="inline text-muted-foreground">Alasan batal: </dt><dd className="inline">{i.outcomeNote}</dd></div> : null}
                {i.status === "SELESAI" && i.outcomeNote ? <div className="sm:col-span-2"><dt className="inline text-muted-foreground">Catatan: </dt><dd className="inline">{i.outcomeNote}</dd></div> : null}
              </dl>
            </li>
          ))}
        </ul>
      ) : null}

      {d && pages > 1 ? (
        <nav aria-label="Halaman" className="flex items-center justify-between gap-3">
          <Button type="button" variant="outline" className="min-h-11" disabled={page <= 1} onClick={() => { setPage((p) => p - 1); setSelected(new Set()); }}>Sebelumnya</Button>
          <p className="text-sm text-muted-foreground" aria-live="polite">Halaman {page} dari {pages} ({d.total} usulan)</p>
          <Button type="button" variant="outline" className="min-h-11" disabled={page >= pages} onClick={() => { setPage((p) => p + 1); setSelected(new Set()); }}>Berikutnya</Button>
        </nav>
      ) : null}

      {creating ? <ProposalFormDialog onClose={() => setCreating(false)} onSaved={() => { setCreating(false); list.reload(); }} /> : null}
      {moving ? <TransitionDialog ids={moving.ids} to={moving.to} onClose={() => setMoving(null)} onDone={() => { setMoving(null); setSelected(new Set()); list.reload(); }} /> : null}
    </div>
  );
}
