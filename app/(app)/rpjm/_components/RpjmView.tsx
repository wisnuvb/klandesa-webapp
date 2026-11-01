"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronRight, ListChecks, Loader2, Lock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { Pill, STEP_STATE_LABEL, fmtDate, rupiah } from "@/components/app/perencanaan/shared";
import { useApiGet } from "@/hooks/useApiGet";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import type { ListResponse } from "./types";

export function RpjmView() {
  const router = useRouter();
  const { data, loading, error, reload } = useApiGet<ListResponse>("/api/perencanaan/rpjm");
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-6 pb-24">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <ListChecks aria-hidden="true" className="size-6 shrink-0" />
            Tahapan RPJM Desa
          </h1>
          <p className="max-w-prose break-words text-muted-foreground">
            Susun RPJM Desa bertahap: tim penyusun, pengkajian keadaan desa, Musyawarah Desa, rancangan (visi-misi, arah kebijakan, program per bidang per tahun dengan anggaran indikatif), pembahasan, lalu Peraturan Desa. Setelah Perdes dihubungkan, isi dikunci. RPJM Desa kini berjangka {data?.rules.termYears ?? 8} tahun.
          </p>
        </div>
        {data?.can.create ? (
          <Button type="button" size="lg" className="min-h-11" onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" />
            Buat RPJM Desa
          </Button>
        ) : null}
      </header>

      {loading ? (
        <p role="status" className="flex items-center gap-2 text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          Memuat…
        </p>
      ) : null}
      {error ? (
        <div role="alert" className="rounded-md border border-destructive p-4 text-destructive">
          {error}{" "}
          <Button type="button" variant="outline" className="ml-2 min-h-11" onClick={reload}>
            Coba lagi
          </Button>
        </div>
      ) : null}

      {data ? (
        data.plans.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="font-medium">Belum ada RPJM Desa.</p>
            <p className="mx-auto mt-1 max-w-prose text-sm text-muted-foreground">
              RPJM Desa ditetapkan paling lama 3 bulan sejak pelantikan Kepala Desa (PP 16/2026 Pasal 145 ayat 4). RKP Desa tiap tahun dijabarkan darinya. Dokumen yang sudah dibuat di menu{" "}
              <Link href="/rpjmdes" className="underline underline-offset-2">
                RPJMDes
              </Link>{" "}
              akan tampil di sini.
            </p>
            {data.can.create ? (
              <Button type="button" className="mt-4 min-h-11" onClick={() => setCreating(true)}>
                <Plus aria-hidden="true" />
                Buat RPJM Desa
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="divide-y rounded-lg border">
            {data.plans.map((p) => (
              <li key={p.id}>
                <Link href={`/rpjm/${p.id}`} className="flex min-h-20 items-center justify-between gap-4 px-4 py-3 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
                  <div className="min-w-0 space-y-1.5">
                    <p className="flex items-center gap-2 break-words font-medium">
                      <span className="min-w-0">
                        {p.title} ({p.periodStart}–{p.periodEnd})
                      </span>
                      {p.locked ? <Lock aria-label="Sudah ditetapkan dan terkunci" className="size-4 shrink-0 text-muted-foreground" /> : null}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {p.termYears} tahun · {p.programCount} program · anggaran indikatif {rupiah(p.totalBudget)}
                    </p>
                    {p.untouched ? (
                      <p className="text-sm text-muted-foreground">Dokumen lama; belum memakai tahapan. Buka untuk mencatat tahapan penyusunan.</p>
                    ) : (
                      <div className="flex items-center gap-3">
                        <progress className="h-2 w-40" max={p.progress.total} value={p.progress.done} aria-label={`Kemajuan tahapan ${p.progress.done} dari ${p.progress.total}`} />
                        <span className="text-sm text-muted-foreground">
                          {p.progress.done}/{p.progress.total} tahap
                        </span>
                      </div>
                    )}
                    {!p.untouched && p.next ? (
                      <p className="text-sm text-muted-foreground">
                        Berikutnya: {p.next.label}
                        {p.next.due ? ` (tenggat ${fmtDate(p.next.due)})` : ""}
                      </p>
                    ) : null}
                    {p.topFlag ? <p className="line-clamp-2 text-sm text-amber-900">{p.topFlag}</p> : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center">
                    {p.needsAdjustment ? (
                      <Pill tone="soon">
                        <AlertTriangle aria-hidden="true" className="mr-1 size-3" />
                        Perlu penyesuaian
                      </Pill>
                    ) : null}
                    {p.overdue > 0 ? <Pill tone="overdue">{p.overdue} tahap terlambat</Pill> : p.locked ? <Pill tone="done">Ditetapkan</Pill> : !p.untouched && p.next ? <Pill tone={p.next.state}>{STEP_STATE_LABEL[p.next.state]}</Pill> : null}
                    <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {creating ? <CreateDialog onClose={() => setCreating(false)} onCreated={(id) => { reload(); router.push(`/rpjm/${id}`); }} /> : null}
    </div>
  );
}

function CreateDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: number) => void }) {
  const y = new Date().getFullYear();
  const [title, setTitle] = useState("");
  const [start, setStart] = useState(String(y));
  const [end, setEnd] = useState(String(y + 7));
  const [inaug, setInaug] = useState("");
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  async function go(e: React.FormEvent) {
    e.preventDefault();
    const r = await submit<{ id?: number }>("/api/perencanaan/rpjm", "POST", { title, periodStart: start, periodEnd: end, headInauguratedOn: inaug || null });
    if (r) onCreated(Number(r.id));
  }
  const err = (k: string) => errors[k];
  const common = (k: string) => ({ id: `rp-${k}`, "aria-invalid": err(k) ? true : undefined, "aria-describedby": err(k) ? `rp-${k}-err` : undefined });
  const errNode = (k: string) => (err(k) ? <p id={`rp-${k}-err`} className="text-sm text-destructive">{err(k)}</p> : null);
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Buat RPJM Desa</DialogTitle>
          <DialogDescription>Jangka waktu bawaan 8 tahun (UU 3/2024 Pasal 79 ayat 2). Periode lain tetap bisa disimpan dan ditandai perlu penyesuaian.</DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="min-w-0 space-y-4" noValidate>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ title: "Judul", periodStart: "Tahun awal", periodEnd: "Tahun akhir", headInauguratedOn: "Tanggal pelantikan" }} />
          <div className="space-y-1.5">
            <Label htmlFor="rp-title">Judul *</Label>
            <Input {...common("title")} className="h-11" maxLength={255} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: RPJM Desa 2026–2033" />
            {errNode("title")}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rp-periodStart">Tahun awal *</Label>
              <Input {...common("periodStart")} className="h-11" type="number" inputMode="numeric" min={2000} max={2100} value={start} onChange={(e) => { setStart(e.target.value); const n = Number(e.target.value); if (Number.isInteger(n)) setEnd(String(n + 7)); }} />
              {errNode("periodStart")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rp-periodEnd">Tahun akhir *</Label>
              <Input {...common("periodEnd")} className="h-11" type="number" inputMode="numeric" min={2000} max={2100} value={end} onChange={(e) => setEnd(e.target.value)} />
              {errNode("periodEnd")}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rp-headInauguratedOn">Tanggal pelantikan Kepala Desa</Label>
            <Input {...common("headInauguratedOn")} className="h-11" type="date" value={inaug} onChange={(e) => setInaug(e.target.value)} />
            <p className="text-sm text-muted-foreground">Dipakai menghitung tenggat penetapan (3 bulan sejak pelantikan) dan memeriksa keselarasan dengan masa jabatan. Boleh dikosongkan.</p>
            {errNode("headInauguratedOn")}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" className="min-h-11" disabled={busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              Buat
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
