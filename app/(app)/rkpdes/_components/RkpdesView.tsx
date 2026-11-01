"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, ChevronRight, Loader2, Lock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { Pill, SELECT_CLASS, STEP_STATE_LABEL, WarningList, fmtDate } from "@/components/app/perencanaan/shared";
import { useApiGet } from "@/hooks/useApiGet";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import type { ListResponse } from "./types";

export function RkpdesView() {
  const router = useRouter();
  const { data, loading, error, reload } = useApiGet<ListResponse>("/api/perencanaan/rkpdes");
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <CalendarClock aria-hidden="true" className="size-6" />
            Siklus RKP Desa
          </h1>
          <p className="max-w-prose text-muted-foreground">
            Kelola tahapan penyusunan RKP Desa menurut Permendagri 114/2014: Musyawarah Desa, tim penyusun, pagu indikatif, rancangan, Musrenbangdes, Peraturan Desa, dan daftar usulan ke kabupaten. Tenggat tiap tahap dihitung otomatis.
          </p>
        </div>
        {data?.can.create ? (
          <Button type="button" size="lg" className="min-h-11" onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" />
            Buat RKP Desa
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
        <>
          <section aria-labelledby="rpjm-h" className="space-y-2">
            <h2 id="rpjm-h" className="text-lg font-semibold">
              RPJM Desa
            </h2>
            {data.plans.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm">
                <p className="font-medium">Belum ada RPJM Desa.</p>
                <p className="mt-1 text-muted-foreground">Kegiatan RKP Desa dijabarkan dari RPJM Desa. Buat dokumennya lebih dahulu di menu{" "}
                  <Link href="/rpjmdes" className="underline underline-offset-2">RPJM Desa</Link>
                  . RPJM Desa kini berjangka 8 tahun.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {data.plans.map((p) => (
                  <li key={p.id} className="rounded-md border p-3 text-sm">
                    <p className="font-medium">
                      {p.title} ({p.periodStart}–{p.periodEnd}) <span className="font-normal text-muted-foreground">· {p.termYears} tahun</span>
                    </p>
                    {p.termNote ? (
                      <div className="mt-2">
                        <WarningList title="Perlu diperhatikan" items={[p.termNote]} />
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="doc-h" className="space-y-2">
            <h2 id="doc-h" className="text-lg font-semibold">
              Dokumen RKP Desa
            </h2>
            {data.documents.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="font-medium">Belum ada dokumen RKP Desa.</p>
                <p className="mx-auto mt-1 max-w-prose text-sm text-muted-foreground">RKP Desa tahun berikutnya disusun mulai Juli dan harus ditetapkan dengan Peraturan Desa paling lambat akhir September (Permendagri 114/2014 Pasal 29).</p>
                {data.can.create ? (
                  <Button type="button" className="mt-4 min-h-11" onClick={() => setCreating(true)}>
                    <Plus aria-hidden="true" />
                    Buat RKP Desa
                  </Button>
                ) : null}
              </div>
            ) : (
              <ul className="divide-y rounded-lg border">
                {data.documents.map((d) => (
                  <li key={d.id}>
                    <Link href={`/rkpdes/${d.id}`} className="flex min-h-20 items-center justify-between gap-4 px-4 py-3 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
                      <div className="min-w-0 space-y-1.5">
                        <p className="flex items-center gap-2 font-medium">
                          RKP Desa {d.year}
                          {d.revision > 0 ? ` — perubahan ke-${d.revision}` : ""}
                          {d.locked ? <Lock aria-label="Sudah ditetapkan dan terkunci" className="size-4 text-muted-foreground" /> : null}
                        </p>
                        <div className="flex items-center gap-3">
                          <progress className="h-2 w-40" max={d.progress.total} value={d.progress.done} aria-label={`Kemajuan tahapan ${d.progress.done} dari ${d.progress.total}`} />
                          <span className="text-sm text-muted-foreground">
                            {d.progress.done}/{d.progress.total} tahap · {d.activityCount} kegiatan
                          </span>
                        </div>
                        {d.next ? (
                          <p className="text-sm text-muted-foreground">
                            Berikutnya: {d.next.label}
                            {d.next.due ? ` (tenggat ${fmtDate(d.next.due)})` : ""}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">Semua tahapan selesai.</p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {d.overdue > 0 ? <Pill tone="overdue">{d.overdue} tahap terlambat</Pill> : d.next ? <Pill tone={d.next.state}>{STEP_STATE_LABEL[d.next.state]}</Pill> : <Pill tone="done">Selesai</Pill>}
                        <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}

      {creating && data ? <CreateDialog reasons={data.terms.changeReasons} onClose={() => setCreating(false)} onCreated={(id) => router.push(`/rkpdes/${id}`)} /> : null}
    </div>
  );
}

function CreateDialog({ reasons, onClose, onCreated }: { reasons: Record<string, string>; onClose: () => void; onCreated: (id: number) => void }) {
  const [year, setYear] = useState(String(new Date().getFullYear() + 1));
  const [perubahan, setPerubahan] = useState(false);
  const [reason, setReason] = useState("");
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  async function go(e: React.FormEvent) {
    e.preventDefault();
    const r = await submit<{ id?: number }>("/api/perencanaan/rkpdes", "POST", { year: Number(year), perubahan, changeReason: perubahan ? reason : null });
    if (r) onCreated(Number(r.id));
  }
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Buat RKP Desa</DialogTitle>
          <DialogDescription>RKP Desa tahun berikutnya disusun pada tahun berjalan. RKP Desa perubahan hanya dibuat setelah yang awal ditetapkan dengan Peraturan Desa.</DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="min-w-0 space-y-4" noValidate>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ year: "Tahun", changeReason: "Alasan perubahan" }} />
          <div className="space-y-1.5">
            <Label htmlFor="rk-year">Tahun RKP Desa *</Label>
            <Input id="rk-year" className="h-11" type="number" inputMode="numeric" min={2000} max={2100} value={year} onChange={(e) => setYear(e.target.value)} />
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" className="size-5" checked={perubahan} onChange={(e) => setPerubahan(e.target.checked)} />
            Ini RKP Desa perubahan
          </label>
          {perubahan ? (
            <div className="space-y-1.5">
              <Label htmlFor="rk-reason">Alasan perubahan *</Label>
              <SearchSelect id="rk-reason" className={SELECT_CLASS} value={reason} onChange={(e) => setReason(e.target.value)}>
                <option value="">Pilih alasan…</option>
                {Object.entries(reasons).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </SearchSelect>
            </div>
          ) : null}
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
