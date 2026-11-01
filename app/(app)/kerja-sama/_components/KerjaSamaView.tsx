"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { Pill, SELECT_CLASS, fmtDate, rupiah } from "@/components/app/perencanaan/shared";
import { useApiGet } from "@/hooks/useApiGet";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { STATUS_TONE, type ListResp } from "./types";

export function KerjaSamaView() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [creating, setCreating] = useState(false);
  const { data, loading, error } = useApiGet<ListResp>(`/api/kerja-sama?year=${year}`);

  return (
    <div className="space-y-6 pb-24">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Kerja Sama Desa</h1>
        <p className="max-w-3xl text-muted-foreground">Kerja sama antar-Desa dan dengan pihak ketiga menurut Permendagri 96/2017: para pihak, ruang lingkup, jangka waktu, RAB bersama, tautan ke Musyawarah Desa, dan dokumen penawaran serta berita acara kesepakatan.</p>
      </header>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ks-year">Tahun</Label>
          <SearchSelect id="ks-year" className={`${SELECT_CLASS} w-32`} value={String(year)} onChange={(e) => setYear(Number(e.target.value))}>
            {[thisYear - 2, thisYear - 1, thisYear, thisYear + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </SearchSelect>
        </div>
        {data?.can.create ? (
          <Button type="button" className="min-h-11" onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" />
            Kerja sama baru
          </Button>
        ) : null}
      </div>

      {loading && !data ? (
        <p role="status" className="flex items-center gap-2 text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          Memuat kerja sama…
        </p>
      ) : null}
      {error ? (
        <div role="alert" className="rounded-md border border-destructive p-4 text-destructive">
          {error}
        </div>
      ) : null}

      {data ? (
        <>
          {data.agreements.length ? (
            <ul className="grid gap-3 lg:grid-cols-2">
              {data.agreements.map((a) => (
                <li key={a.id} className="min-w-0 space-y-2 rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <Link href={`/kerja-sama/${a.id}`} className="inline-flex min-h-11 min-w-0 items-center break-words text-lg font-semibold underline underline-offset-4">
                      {a.title}
                    </Link>
                    <Pill tone={STATUS_TONE[a.status]}>{a.statusLabel}</Pill>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {a.kindLabel} · {a.fieldLabel}
                  </p>
                  <p className="break-words text-sm">Pihak lain: {a.counterparts.length ? a.counterparts.join(", ") : "belum didaftarkan"}</p>
                  <p className="text-sm">
                    RAB bersama {rupiah(a.total)}; beban Desa ini {rupiah(a.selfShare)}
                    {a.termStartOn || a.termEndOn ? ` · ${fmtDate(a.termStartOn)} s.d. ${fmtDate(a.termEndOn)}` : ""}
                  </p>
                  {a.warnCount ? <p className="text-sm font-medium text-amber-900">{a.warnCount} perlu diperiksa</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Belum ada kerja sama untuk tahun {year}. Mulailah dari musyawarah desa yang membahas bidang atau potensi yang akan dikerjasamakan.</p>
          )}
          <details className="rounded-lg border p-3 text-sm">
            <summary className="min-h-11 cursor-pointer py-2 font-medium">Dasar aturan dan batasnya</summary>
            <ul className="mt-2 space-y-1">
              {data.catalog.sources.map((s) => (
                <li key={s.ref} className="break-words">
                  <strong>{s.ref}</strong> ({s.status === "V" ? "dibaca dari teks resmi" : "belum diverifikasi"}): {s.note}
                </li>
              ))}
            </ul>
          </details>
        </>
      ) : null}
      {creating && data ? <CreateDialog year={year} catalog={data.catalog} onClose={() => setCreating(false)} /> : null}
    </div>
  );
}

function CreateDialog({ year, catalog, onClose }: { year: number; catalog: ListResp["catalog"]; onClose: () => void }) {
  const router = useRouter();
  const [kind, setKind] = useState("ANTAR_DESA");
  const [initiative, setInitiative] = useState("DESA");
  const [title, setTitle] = useState("");
  const [field, setField] = useState("PEMBANGUNAN");
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  async function go(e: React.FormEvent) {
    e.preventDefault();
    const r = await submit<{ id: number }>("/api/kerja-sama", "POST", { year, kind, initiative: kind === "PIHAK_KETIGA" ? initiative : null, title, field });
    if (r?.id) router.push(`/kerja-sama/${r.id}`);
  }
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Kerja sama baru ({year})</DialogTitle>
          <DialogDescription>Pihak &quot;Desa ini&quot; dibuat otomatis. Pihak lain dan isi kerja sama dilengkapi di halaman berikutnya.</DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="grid min-w-0 gap-4" noValidate>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ year: "Tahun", kind: "Jenis", initiative: "Prakarsa", title: "Judul", field: "Bidang" }} />
          <div className="space-y-1.5">
            <Label htmlFor="ks-kind">Jenis *</Label>
            <SearchSelect id="ks-kind" className={SELECT_CLASS} value={kind} onChange={(e) => setKind(e.target.value)}>
              {Object.entries(catalog.kinds).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </SearchSelect>
          </div>
          {kind === "PIHAK_KETIGA" ? (
            <div className="space-y-1.5">
              <Label htmlFor="ks-init">Prakarsa *</Label>
              <SearchSelect id="ks-init" className={SELECT_CLASS} value={initiative} onChange={(e) => setInitiative(e.target.value)} aria-invalid={Boolean(errors.initiative)}>
                {Object.entries(catalog.initiatives).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </SearchSelect>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="ks-title">Judul kerja sama *</Label>
            <Input id="ks-title" className="h-11" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={Boolean(errors.title)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ks-field">Bidang *</Label>
            <SearchSelect id="ks-field" className={SELECT_CLASS} value={field} onChange={(e) => setField(e.target.value)}>
              {Object.entries(catalog.fields).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </SearchSelect>
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
