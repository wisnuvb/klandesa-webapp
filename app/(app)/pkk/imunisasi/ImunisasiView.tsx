"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Syringe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { localToday } from "@/lib/form-input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormErrorSummary, fieldA11y } from "@/components/app/FormErrorSummary";
import { ResidentPicker } from "@/components/app/ResidentPicker";
import { useApiGet } from "@/hooks/useApiGet";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import type { ResidentPick } from "@/lib/kependudukan/mutasi-labels";
import type { CoverageReport, DoseStatus } from "@/lib/gizi/immunization";

const day = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const today = localToday;
const num = (v: number) => String(v).replace(".", ",");

export function ImunisasiView() {
  const { data, loading, error, reload } = useApiGet<CoverageReport>("/api/pkk/imunisasi/cakupan");
  const [target, setTarget] = useState<{ id: number; name: string } | null>(null);
  const [pick, setPick] = useState<ResidentPick | null>(null);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Button asChild variant="ghost" className="min-h-11">
          <Link href="/pkk">
            <ArrowLeft aria-hidden="true" />
            Kembali ke PKK
          </Link>
        </Button>
        <header className="space-y-2">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Syringe aria-hidden="true" className="size-6" />
            Imunisasi Anak
          </h1>
          <p className="max-w-prose text-muted-foreground">
            Catat imunisasi rutin dan pantau anak 0–24 bulan yang masih tertinggal dosis. Jadwal mengikuti program imunisasi rutin Kemenkes dan dapat berbeda di daerah Anda; patokan akhir tetap buku KIA dan petugas puskesmas.
          </p>
        </header>
      </div>

      <section aria-label="Catat untuk anak tertentu" className="space-y-2 rounded-lg border p-4">
        <ResidentPicker value={pick} onChange={setPick} label="Cari anak untuk dicatat imunisasinya" />
        {pick ? (
          <Button type="button" className="min-h-11" onClick={() => setTarget({ id: pick.id, name: pick.name })}>Catat imunisasi {pick.name}</Button>
        ) : null}
      </section>

      {loading ? <p role="status" className="flex items-center gap-2 p-6 text-muted-foreground"><Loader2 aria-hidden="true" className="size-5 animate-spin" />Menghitung…</p> : null}
      {error ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          <p>{error}</p>
          <Button type="button" variant="outline" className="min-h-11" onClick={reload}>Coba lagi</Button>
        </div>
      ) : null}

      {data ? (
        <>
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-4"><dt className="text-sm text-muted-foreground">Anak 0–24 bulan</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{data.children}</dd></div>
            <div className={`rounded-lg border p-4 ${data.children - data.upToDate > 0 ? "border-destructive/60" : ""}`}><dt className="text-sm text-muted-foreground">Masih tertinggal dosis</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{data.children - data.upToDate}</dd></div>
          </dl>

          {data.perVaccine.length > 0 ? (
            <section aria-labelledby="im-cakupan" className="space-y-2">
              <h2 id="im-cakupan" className="text-lg font-semibold">Cakupan per jenis</h2>
              <p className="text-sm text-muted-foreground">Dihitung dari anak yang usianya sudah mencapai usia anjuran jenis tersebut.</p>
              <ul className="space-y-2">
                {data.perVaccine.map((p) => (
                  <li key={p.code} className="space-y-1">
                    <div className="flex justify-between gap-3 text-sm"><span>{p.label}</span><span className="tabular-nums">{p.given}/{p.eligible} anak ({num(p.percent)}%)</span></div>
                    <div className="h-2.5 overflow-hidden rounded bg-muted" role="presentation"><div className={`h-full ${p.percent >= 90 ? "bg-primary" : "bg-amber-500"}`} style={{ width: `${p.percent}%` }} /></div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section aria-labelledby="im-tertinggal" className="space-y-2">
            <h2 id="im-tertinggal" className="text-lg font-semibold">Anak yang perlu dilengkapi</h2>
            {data.behind.length === 0 ? <p className="rounded-lg border border-dashed p-6 text-center">{data.children === 0 ? "Belum ada anak 0–24 bulan di data warga." : "Semua anak sudah lengkap sesuai jadwal."}</p> : (
              <ul className="space-y-2">
                {data.behind.map((b) => (
                  <li key={b.residentId} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="break-words font-medium">{b.name}<span className="font-normal text-muted-foreground"> · RT {b.rt ?? "-"}/RW {b.rw ?? "-"} · {num(b.ageMonths)} bulan</span></p>
                        <p className="text-sm">Belum: {b.missing.join(", ")}</p>
                      </div>
                      <Button type="button" variant="outline" className="min-h-11" onClick={() => setTarget({ id: b.residentId, name: b.name })} aria-label={`Catat imunisasi ${b.name}`}>Catat</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}

      {target ? <DoseDialog residentId={target.id} name={target.name} onClose={() => setTarget(null)} onSaved={() => { setTarget(null); reload(); }} /> : null}
    </div>
  );
}

function DoseDialog({ residentId, name, onClose, onSaved }: { residentId: number; name: string; onClose: () => void; onSaved: () => void }) {
  const { data, loading, error, reload } = useApiGet<{ name: string; ageMonths: number; doses: DoseStatus[] }>(`/api/pkk/imunisasi?residentId=${residentId}`);
  const [codes, setCodes] = useState<Set<string>>(new Set());
  const [givenAt, setGivenAt] = useState(today());
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const del = useFormSubmit();
  const toggle = (c: string) => setCodes((s) => { const n = new Set(s); if (n.has(c)) n.delete(c); else n.add(c); return n; });

  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Imunisasi {name}</DialogTitle>
          <DialogDescription>{data ? `Usia ${num(data.ageMonths)} bulan. ` : ""}Centang dosis yang diberikan pada tanggal yang sama.</DialogDescription>
        </DialogHeader>
        {loading ? <p role="status" className="flex items-center gap-2 text-muted-foreground"><Loader2 aria-hidden="true" className="size-4 animate-spin" />Memuat…</p> : null}
        {error ? <p role="alert" className="text-destructive">{error}</p> : null}
        {data ? (
          <form onSubmit={async (e) => { e.preventDefault(); if (await submit("/api/pkk/imunisasi", "POST", { residentId, givenAt, codes: [...codes] })) onSaved(); }} className="space-y-4" noValidate>
            <fieldset className="space-y-1">
              <legend className="mb-1 text-sm font-medium">Dosis</legend>
              <ul className="divide-y rounded-md border">
                {data.doses.map((d) => (
                  <li key={d.code} className="flex min-h-11 items-center justify-between gap-2 px-3 py-1.5 text-sm">
                    {d.state === "DIBERIKAN" ? (
                      <>
                        <span>{d.label}</span>
                        <span className="flex items-center gap-2 text-muted-foreground">
                          Sudah, {day(d.givenAt as string)}
                          <Button type="button" variant="ghost" size="sm" className="min-h-11" disabled={del.busy} aria-label={`Hapus catatan ${d.label}`} onClick={async () => { if (await del.submit(`/api/pkk/imunisasi?residentId=${residentId}&code=${d.code}`, "DELETE", undefined, "Gagal menghapus.")) reload(); }}>Hapus</Button>
                        </span>
                      </>
                    ) : (
                      <label className="flex min-h-11 flex-1 cursor-pointer items-center justify-between gap-3">
                        <span className={d.state === "BELUM_WAKTUNYA" ? "text-muted-foreground" : "font-medium"}>{d.label}<span className="ml-2 text-xs font-normal text-muted-foreground">{d.state === "WAKTUNYA" ? "sudah waktunya" : `anjuran ${d.dueMonths} bln`}</span></span>
                        <input type="checkbox" className="size-5" checked={codes.has(d.code)} onChange={() => toggle(d.code)} aria-label={`Berikan ${d.label}`} />
                      </label>
                    )}
                  </li>
                ))}
              </ul>
              <FieldError id="im-codes" message={errors.codes} />
            </fieldset>
            <div className="space-y-1.5">
              <Label htmlFor="im-date">Tanggal pemberian *</Label>
              <Input {...fieldA11y("im-date", errors.givenAt)} className="h-11" type="date" value={givenAt} onChange={(e) => setGivenAt(e.target.value)} />
              <FieldError id="im-date" message={errors.givenAt} />
            </div>
            <FormErrorSummary innerRef={summaryRef} errors={errors} general={general ?? del.general} labels={{ codes: "Dosis", givenAt: "Tanggal", residentId: "Anak" }} />
            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>Batal</Button>
              <Button type="submit" className="min-h-11" disabled={busy || codes.size === 0}>
                {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
                {busy ? "Menyimpan…" : `Simpan ${codes.size} dosis`}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
