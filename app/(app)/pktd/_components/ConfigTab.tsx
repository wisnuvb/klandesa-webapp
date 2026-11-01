"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { rupiah } from "@/components/app/perencanaan/shared";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import type { TabProps } from "./types";

const whole = (v: string | null) => (v === null ? "" : String(Math.round(Number(v))));

export function ConfigTab({ data, reload }: TabProps) {
  const a = data.activity;
  const done = a.status === "SELESAI";
  const canEdit = data.can.update;
  const [f, setF] = useState<Record<string, string | null>>({});
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));
  const val = (k: string, saved: string | null) => f[k] ?? saved ?? "";
  const form = useFormSubmit();
  const dirty = Object.keys(f).length > 0;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r = await form.submit(`/api/pktd/${a.id}`, "PATCH", f);
    if (r) {
      setF({});
      reload();
    }
  }
  async function setStatus(status: "AKTIF" | "SELESAI") {
    const r = await form.submit(`/api/pktd/${a.id}`, "PATCH", { status });
    if (r) reload();
  }

  return (
    <>
      <form onSubmit={save} className="space-y-4 rounded-lg border p-4" noValidate>
        <h2 className="text-lg font-semibold">Biaya, jadwal, dan batas upah harian</h2>
        <FormErrorSummary innerRef={form.summaryRef} errors={form.errors} general={form.general} labels={{ title: "Nama kegiatan", cost: "Total biaya", plannedWage: "Rencana upah", wageMin: "Batas bawah upah", wageMax: "Batas atas upah", startDate: "Tanggal mulai", endDate: "Tanggal selesai" }} />
        {done ? <p className="text-sm text-muted-foreground">Kegiatan sudah selesai. Buka kembali untuk mengubah isian.</p> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="cf-title">Nama kegiatan</Label>
            <Input id="cf-title" className="h-11" maxLength={200} disabled={!canEdit || done} value={val("title", a.title)} onChange={(e) => set("title", e.target.value)} aria-invalid={Boolean(form.errors.title)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cf-cost">Total biaya kegiatan (RAB)</Label>
            <CurrencyInput id="cf-cost" inputClassName="h-11" disabled={!canEdit || done} value={f.cost ?? whole(a.cost)} onValueChange={(v) => set("cost", v)} aria-invalid={Boolean(form.errors.cost)} />
            {a.apbdesBudget ? <p className="text-xs text-muted-foreground">Anggaran kegiatan ini di APB Desa: {rupiah(a.apbdesBudget)}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cf-wage">Rencana upah dalam RAB (minimal {a.minPct}% biaya)</Label>
            <CurrencyInput id="cf-wage" inputClassName="h-11" disabled={!canEdit || done} value={f.plannedWage ?? whole(a.plannedWage)} onValueChange={(v) => set("plannedWage", v)} aria-invalid={Boolean(form.errors.plannedWage)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cf-start">Tanggal mulai</Label>
            <Input id="cf-start" type="date" className="h-11" disabled={!canEdit || done} value={val("startDate", a.startDate)} onChange={(e) => set("startDate", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cf-end">Tanggal selesai</Label>
            <Input id="cf-end" type="date" className="h-11" disabled={!canEdit || done} value={val("endDate", a.endDate)} onChange={(e) => set("endDate", e.target.value)} aria-invalid={Boolean(form.errors.endDate)} />
          </div>
        </div>

        <fieldset className="space-y-3 rounded-md border p-3" disabled={!canEdit || done}>
          <legend className="px-1 text-sm font-medium">Batas upah harian</legend>
          <p className="text-sm text-muted-foreground">Ditetapkan lewat kesepakatan Musyawarah Desa (batas atas harus di bawah upah minimum provinsi) atau mengikuti Peraturan Bupati. Pencatatan hari kerja di luar batas ini akan ditolak.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cf-min">Batas bawah per hari</Label>
              <CurrencyInput id="cf-min" inputClassName="h-11" value={f.wageMin ?? whole(a.wageMin)} onValueChange={(v) => set("wageMin", v)} aria-invalid={Boolean(form.errors.wageMin)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cf-max">Batas atas per hari</Label>
              <CurrencyInput id="cf-max" inputClassName="h-11" value={f.wageMax ?? whole(a.wageMax)} onValueChange={(v) => set("wageMax", v)} aria-invalid={Boolean(form.errors.wageMax)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="cf-basis">Dasar penetapan (mis. Musyawarah Desa tanggal …, atau Perbup nomor …)</Label>
              <Input id="cf-basis" className="h-11" maxLength={200} value={val("wageBasis", a.wageBasis)} onChange={(e) => set("wageBasis", e.target.value)} />
            </div>
          </div>
        </fieldset>

        <div className="space-y-1.5">
          <Label htmlFor="cf-note">Catatan (mis. jaminan sosial ketenagakerjaan pekerja)</Label>
          <Textarea id="cf-note" rows={2} maxLength={500} disabled={!canEdit} value={val("note", a.note)} onChange={(e) => set("note", e.target.value)} />
        </div>
        {canEdit ? (
          <Button type="submit" className="min-h-11" disabled={form.busy || !dirty}>
            {form.busy ? "Menyimpan…" : "Simpan"}
          </Button>
        ) : null}
      </form>

      {canEdit ? (
        <section aria-labelledby="cf-st-h" className="space-y-2">
          <h2 id="cf-st-h" className="text-lg font-semibold">
            Status kegiatan
          </h2>
          <p className="text-sm text-muted-foreground">{done ? "Kegiatan selesai: pencatatan hari kerja terkunci." : "Tandai selesai bila pekerjaan fisik sudah rampung dan upah sudah dibayarkan; sistem lalu memeriksa apakah upah terealisasi memenuhi batas minimal."}</p>
          <Button type="button" variant={done ? "outline" : "default"} className="min-h-11" disabled={form.busy} onClick={() => setStatus(done ? "AKTIF" : "SELESAI")}>
            {done ? "Buka kembali" : "Tandai selesai"}
          </Button>
        </section>
      ) : null}
    </>
  );
}
