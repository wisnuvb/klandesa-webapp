"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Circle, Download, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError, FormErrorSummary, fieldA11y } from "@/components/app/FormErrorSummary";
import { useApiGet } from "@/hooks/useApiGet";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import type { FormationView } from "@/lib/coop/formation";

interface Resp {
  formation: FormationView;
  canManage: boolean;
}

const fmt = (d: string | null) => (d ? new Date(`${d}T00:00:00Z`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : null);
const rupiah = (v: string) => `Rp${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Number(v))}`;

export function PembentukanView() {
  const { data, loading, error, reload } = useApiGet<Resp>("/api/coop/formation");
  const [editing, setEditing] = useState(false);
  const f = data?.formation;
  const done = f ? f.steps.filter((s) => s.done).length : 0;

  const detail: Record<string, string | null> = f
    ? {
        musdesus: [fmt(f.musdesusAt), f.musdesusRef ? `BA ${f.musdesusRef}` : null].filter(Boolean).join(", ") || null,
        kades: fmt(f.kadesApprovedAt),
        akta: [f.deedNumber ? `Akta ${f.deedNumber}` : null, fmt(f.deedDate), f.notaryName].filter(Boolean).join(", ") || null,
        komitmen: [f.commitmentRef, f.commitmentAmount ? rupiah(f.commitmentAmount) : null].filter(Boolean).join(", ") || null,
        pemkab: fmt(f.submittedToRegencyAt),
        sk: [f.skNumber, fmt(f.skDate)].filter(Boolean).join(", ") || null,
        npwp: fmt(f.npwpAt),
        simkopdes: fmt(f.simkopdesAt),
      }
    : {};

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Button asChild variant="ghost" className="min-h-11">
          <Link href="/koperasi">
            <ArrowLeft aria-hidden="true" />
            Kembali ke Koperasi
          </Link>
        </Button>
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Pembentukan Kopdes Merah Putih</h1>
            <p className="max-w-prose text-muted-foreground">
              Catat langkah pembentukan di sisi desa mengikuti Juklak Kemenkop 1/2025. Ini hanya pencatatan; keabsahan koperasi tetap ditentukan akta notaris, SK pengesahan, dan sistem Simkopdes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {data?.canManage ? (
              <>
                <Button asChild variant="outline" className="min-h-11">
                  <a href="/api/coop/members/export" download>
                    <Download aria-hidden="true" />
                    Unduh anggota (CSV)
                  </a>
                </Button>
                <Button type="button" size="lg" className="min-h-11" onClick={() => setEditing(true)}>
                  <Pencil aria-hidden="true" />
                  Isi / ubah catatan
                </Button>
              </>
            ) : null}
          </div>
        </header>
      </div>

      {loading ? (
        <p role="status" className="flex items-center gap-2 p-6 text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-5 animate-spin" />
          Memuat…
        </p>
      ) : null}
      {error ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          <p>{error}</p>
          <Button type="button" variant="outline" className="min-h-11" onClick={reload}>Coba lagi</Button>
        </div>
      ) : null}

      {f ? (
        <>
          <p className="text-sm font-medium" aria-live="polite">
            {done} dari {f.steps.length} langkah tercatat
          </p>
          <ol className="space-y-2">
            {f.steps.map((s) => (
              <li key={s.key} className={`flex items-start gap-3 rounded-lg border p-3 ${s.done ? "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-50" : ""}`}>
                {s.done ? <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0" /> : <Circle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />}
                <div className="min-w-0">
                  <p className="font-medium">
                    {s.label}
                    <span className="sr-only">{s.done ? " (sudah)" : " (belum)"}</span>
                  </p>
                  {s.done && detail[s.key] ? <p className="text-sm">{detail[s.key]}</p> : null}
                </div>
              </li>
            ))}
          </ol>
          {f.musdesusNotes ? (
            <section aria-labelledby="notulen" className="rounded-lg border p-4">
              <h2 id="notulen" className="font-semibold">Ringkasan keputusan musdesus</h2>
              <p className="mt-1 whitespace-pre-wrap text-sm">{f.musdesusNotes}</p>
            </section>
          ) : null}
          {f.notes ? <p className="text-sm text-muted-foreground">{f.notes}</p> : null}
        </>
      ) : null}

      {editing && f ? <FormationDialog f={f} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); reload(); }} /> : null}
    </div>
  );
}

const LABELS: Record<string, string> = {
  musdesusAt: "Tanggal musdesus", musdesusRef: "Nomor berita acara", musdesusNotes: "Ringkasan keputusan", kadesApprovedAt: "Persetujuan kepala desa", deedNumber: "Nomor akta", deedDate: "Tanggal akta", notaryName: "Notaris",
  commitmentRef: "Nomor surat komitmen", commitmentAmount: "Nilai komitmen", submittedToRegencyAt: "Disampaikan ke pemkab", skNumber: "Nomor SK", skDate: "Tanggal SK", npwpAt: "Tanggal NPWP", simkopdesAt: "Tanggal akun Simkopdes", notes: "Catatan",
};

function FormationDialog({ f, onClose, onSaved }: { f: FormationView; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState<Record<string, string>>(() => ({
    musdesusAt: f.musdesusAt ?? "", musdesusRef: f.musdesusRef ?? "", musdesusNotes: f.musdesusNotes ?? "", kadesApprovedAt: f.kadesApprovedAt ?? "",
    deedNumber: f.deedNumber ?? "", deedDate: f.deedDate ?? "", notaryName: f.notaryName ?? "", commitmentRef: f.commitmentRef ?? "",
    commitmentAmount: f.commitmentAmount ? f.commitmentAmount.replace(/\.00$/, "") : "", submittedToRegencyAt: f.submittedToRegencyAt ?? "",
    skNumber: f.skNumber ?? "", skDate: f.skDate ?? "", npwpAt: f.npwpAt ?? "", simkopdesAt: f.simkopdesAt ?? "", notes: f.notes ?? "",
  }));
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const set = (k: string, val: string) => setV((x) => ({ ...x, [k]: val }));
  const text = (k: string, label: string, max = 150) => (
    <div className="space-y-1.5">
      <Label htmlFor={`kf-${k}`}>{label}</Label>
      <Input {...fieldA11y(`kf-${k}`, errors[k])} className="h-11" value={v[k]} maxLength={max} onChange={(e) => set(k, e.target.value)} />
      <FieldError id={`kf-${k}`} message={errors[k]} />
    </div>
  );
  const date = (k: string, label: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`kf-${k}`}>{label}</Label>
      <Input {...fieldA11y(`kf-${k}`, errors[k])} className="h-11" type="date" value={v[k]} onChange={(e) => set(k, e.target.value)} />
      <FieldError id={`kf-${k}`} message={errors[k]} />
    </div>
  );

  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Catatan pembentukan Kopdes</DialogTitle>
          <DialogDescription>Isi yang sudah terlaksana; kolom boleh dikosongkan dan dilengkapi nanti. Tanggal tak boleh di masa depan dan mengikuti urutan proses.</DialogDescription>
        </DialogHeader>
        <form onSubmit={async (e) => { e.preventDefault(); if (await submit("/api/coop/formation", "PUT", v)) onSaved(); }} className="space-y-4" noValidate>
          <fieldset className="space-y-3 rounded-lg border p-3">
            <legend className="px-1 text-sm font-semibold">1. Musyawarah Desa Khusus</legend>
            <div className="grid gap-3 sm:grid-cols-2">{date("musdesusAt", "Tanggal musdesus")}{text("musdesusRef", "Nomor berita acara")}</div>
            <div className="space-y-1.5">
              <Label htmlFor="kf-musdesusNotes">Ringkasan keputusan</Label>
              <Textarea {...fieldA11y("kf-musdesusNotes", errors.musdesusNotes)} rows={3} value={v.musdesusNotes} maxLength={2000} onChange={(e) => set("musdesusNotes", e.target.value)} />
              <FieldError id="kf-musdesusNotes" message={errors.musdesusNotes} />
            </div>
            {date("kadesApprovedAt", "Tanggal persetujuan kepala desa")}
          </fieldset>
          <fieldset className="space-y-3 rounded-lg border p-3">
            <legend className="px-1 text-sm font-semibold">2. Akta dan komitmen modal</legend>
            <div className="grid gap-3 sm:grid-cols-2">{text("deedNumber", "Nomor akta pendirian", 100)}{date("deedDate", "Tanggal akta")}{text("notaryName", "Nama notaris")}{text("commitmentRef", "Nomor surat komitmen modal awal APBDesa")}</div>
            <div className="space-y-1.5">
              <Label htmlFor="kf-commitmentAmount">Nilai komitmen modal awal</Label>
              <CurrencyInput {...fieldA11y("kf-commitmentAmount", errors.commitmentAmount)} inputClassName="h-11" value={v.commitmentAmount} onValueChange={(d) => set("commitmentAmount", d)} />
              <FieldError id="kf-commitmentAmount" message={errors.commitmentAmount} />
            </div>
          </fieldset>
          <fieldset className="space-y-3 rounded-lg border p-3">
            <legend className="px-1 text-sm font-semibold">3. Pengesahan dan legalitas</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {date("submittedToRegencyAt", "Disampaikan ke pemkab")}{text("skNumber", "Nomor SK pengesahan", 100)}{date("skDate", "Tanggal SK")}{date("npwpAt", "Tanggal NPWP terbit")}{date("simkopdesAt", "Tanggal akun Simkopdes")}
            </div>
          </fieldset>
          <div className="space-y-1.5">
            <Label htmlFor="kf-notes">Catatan</Label>
            <Textarea {...fieldA11y("kf-notes", errors.notes)} rows={2} value={v.notes} maxLength={1000} onChange={(e) => set("notes", e.target.value)} />
            <FieldError id="kf-notes" message={errors.notes} />
          </div>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={LABELS} />
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>Batal</Button>
            <Button type="submit" className="min-h-11" disabled={busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              {busy ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
