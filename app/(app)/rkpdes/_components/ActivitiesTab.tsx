"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDelete } from "@/components/app/ConfirmDelete";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { Pill, SELECT_CLASS, WarningList, rupiah } from "@/components/app/perencanaan/shared";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import type { ActivityView, DetailResponse } from "./types";

export function ActivitiesTab({ data, editable, canDelete, reload }: { data: DetailResponse; editable: boolean; canDelete: boolean; reload: () => void }) {
  const d = data.document;
  const [editing, setEditing] = useState<ActivityView | "new" | null>(null);
  const s = d.activitySummary;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <div className="flex gap-1.5">
            <dt className="text-muted-foreground">Kegiatan:</dt>
            <dd className="font-medium">{s.count}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-muted-foreground">Total anggaran:</dt>
            <dd className="font-medium">{rupiah(s.totalBudget)}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-muted-foreground">Lengkap:</dt>
            <dd className="font-medium">
              {s.complete}/{s.count}
            </dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-muted-foreground">Diusulkan ke kabupaten:</dt>
            <dd className="font-medium">{s.proposed}</dd>
          </div>
        </dl>
        {editable ? (
          <Button type="button" className="min-h-11" onClick={() => setEditing("new")} disabled={!d.plan}>
            <Plus aria-hidden="true" />
            Tambah kegiatan
          </Button>
        ) : null}
      </div>
      <WarningList title="Anggaran melebihi pagu" items={d.paguWarnings} />

      {d.activities.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Belum ada kegiatan. Tambahkan kegiatan hasil Musyawarah Desa dan pencermatan RPJM Desa.</p>
      ) : (
        <ul className="space-y-3">
          {d.activities.map((a) => (
            <li key={a.id} className="space-y-2 rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 space-y-0.5">
                  <p className="font-medium">{a.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {a.activityCode ? `${a.activityCode} ${a.activityName ?? ""}` : "Kode kegiatan belum dipilih"}
                  </p>
                  {a.rpjmProgramTitle ? <p className="break-words text-sm text-muted-foreground">Program RPJM Desa: {a.rpjmProgramTitle}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  {a.warnings.length === 0 ? (
                    <Pill tone="done">
                      <CheckCircle2 aria-hidden="true" className="mr-1 size-3" />
                      Lengkap
                    </Pill>
                  ) : (
                    <Pill tone="soon">
                      <AlertTriangle aria-hidden="true" className="mr-1 size-3" />
                      {a.warnings.length} catatan
                    </Pill>
                  )}
                  {a.proposeToRegency ? <Pill tone="info">Usulan ke kabupaten</Pill> : null}
                  {a.rpjmProgramTitle ? <Pill tone="neutral">Dari program RPJM Desa</Pill> : null}
                </div>
              </div>
              <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-muted-foreground">Anggaran</dt>
                  <dd>{rupiah(a.estimatedBudget)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Sumber dana</dt>
                  <dd>{a.fundSource ? data.terms.paguSources[a.fundSource] ?? a.fundSource : "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Cara</dt>
                  <dd>{a.method ? data.terms.methods[a.method] ?? a.method : "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Keluaran</dt>
                  <dd>{a.outputName ? `${a.outputName}${a.outputVolume ? `, ${a.outputVolume} ${a.outputUnit ?? ""}` : ""}` : "-"}</dd>
                </div>
              </dl>
              {a.warnings.length ? (
                <details className="text-sm">
                  <summary className="min-h-8 cursor-pointer text-muted-foreground">Lihat catatan kelengkapan</summary>
                  <ul className="mt-1 list-disc space-y-0.5 pl-6">
                    {a.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </details>
              ) : null}
              {editable || canDelete ? (
                <div className="flex gap-2">
                  {editable ? (
                    <Button type="button" variant="outline" className="min-h-11" onClick={() => setEditing(a)}>
                      <Pencil aria-hidden="true" />
                      Ubah
                    </Button>
                  ) : null}
                  {canDelete ? (
                    <ConfirmDelete
                      label={`Hapus kegiatan ${a.title}`}
                      buttonText="Hapus"
                      title="Hapus kegiatan ini?"
                      description={`Kegiatan "${a.title}" akan dihapus dari RKP Desa ini. Program RPJM Desa asalnya (bila ada) tidak ikut terhapus. Tindakan ini tidak dapat dibatalkan.`}
                      url={`/api/perencanaan/rkpdes/${d.id}/kegiatan/${a.id}`}
                      onDone={reload}
                    />
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {editing ? <ActivityDialog data={data} activity={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} /> : null}
    </>
  );
}

interface Form {
  title: string;
  activityCode: string;
  description: string;
  location: string;
  estimatedBudget: string;
  fundSource: string;
  method: string;
  outputName: string;
  outputVolume: string;
  outputUnit: string;
  executorChair: string;
  executorSecretary: string;
  executorTreasurer: string;
  executorMembers: string;
  executorHasWoman: boolean;
  rabVerifiedAt: string;
  proposeToRegency: boolean;
  rpjmProgramId: string;
}

const LABELS: Record<string, string> = {
  title: "Nama kegiatan",
  activityCode: "Kegiatan (kode)",
  description: "Uraian",
  location: "Lokasi",
  estimatedBudget: "Anggaran",
  fundSource: "Sumber dana",
  method: "Cara pelaksanaan",
  outputName: "Keluaran",
  outputVolume: "Volume",
  outputUnit: "Satuan",
  executorChair: "Ketua pelaksana",
  executorSecretary: "Sekretaris pelaksana",
  executorTreasurer: "Bendahara pelaksana",
  executorMembers: "Anggota pelaksana",
  rabVerifiedAt: "Tanggal verifikasi RAB",
  rpjmProgramId: "Program RPJM Desa",
};

function ActivityDialog({ data, activity, onClose, onSaved }: { data: DetailResponse; activity: ActivityView | null; onClose: () => void; onSaved: () => void }) {
  const editing = activity !== null;
  const [f, setF] = useState<Form>({
    title: activity?.title ?? "",
    activityCode: activity?.activityCode ?? "",
    description: activity?.description ?? "",
    location: activity?.location ?? "",
    estimatedBudget: activity?.estimatedBudget ? activity.estimatedBudget.replace(/\.00$/, "") : "",
    fundSource: activity?.fundSource ?? "",
    method: activity?.method ?? "",
    outputName: activity?.outputName ?? "",
    outputVolume: activity?.outputVolume ? activity.outputVolume.replace(/\.00$/, "") : "",
    outputUnit: activity?.outputUnit ?? "",
    executorChair: activity?.executorChair ?? "",
    executorSecretary: activity?.executorSecretary ?? "",
    executorTreasurer: activity?.executorTreasurer ?? "",
    executorMembers: activity?.executorMembers ?? "",
    executorHasWoman: activity?.executorHasWoman === true,
    rabVerifiedAt: activity?.rabVerifiedAt ?? "",
    proposeToRegency: activity?.proposeToRegency ?? false,
    rpjmProgramId: activity?.rpjmProgramId ? String(activity.rpjmProgramId) : "",
  });
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const set = (p: Partial<Form>) => setF((x) => ({ ...x, ...p }));
  const base = `/api/perencanaan/rkpdes/${data.document.id}/kegiatan`;

  async function go(e: React.FormEvent) {
    e.preventDefault();
    const r = await submit(editing ? `${base}/${activity!.id}` : base, editing ? "PATCH" : "POST", { ...f, rpjmProgramId: f.rpjmProgramId ? Number(f.rpjmProgramId) : null });
    if (r) onSaved();
  }
  const programs = data.options.rpjmPrograms;
  function pickProgram(id: string) {
    const x = programs.find((q) => String(q.id) === id);
    if (!x || editing) return set({ rpjmProgramId: id });
    set({
      rpjmProgramId: id,
      title: f.title || x.title,
      activityCode: x.activityCode ?? f.activityCode,
      location: x.location ?? f.location,
      estimatedBudget: x.budget ? x.budget.replace(/\.00$/, "") : f.estimatedBudget,
      fundSource: x.fundSource ?? f.fundSource,
      method: x.method ?? f.method,
      outputVolume: x.outputVolume ? x.outputVolume.replace(/\.00$/, "") : f.outputVolume,
      outputUnit: x.outputUnit ?? f.outputUnit,
    });
  }
  const err = (k: string) => errors[k];
  const common = (k: keyof Form) => ({ id: `ac-${k}`, "aria-invalid": err(k) ? true : undefined, "aria-describedby": err(k) ? `ac-${k}-err` : undefined });
  const errNode = (k: string) => (err(k) ? <p id={`ac-${k}-err`} className="text-sm text-destructive">{err(k)}</p> : null);
  const text = (k: keyof Form, label: string, max: number, extra?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`ac-${k}`}>{label}</Label>
      <Input {...common(k)} className="h-11" maxLength={max} value={String(f[k])} onChange={(e) => set({ [k]: e.target.value } as Partial<Form>)} placeholder={extra} />
      {errNode(k)}
    </div>
  );

  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Ubah kegiatan" : "Tambah kegiatan"}</DialogTitle>
          <DialogDescription>Isian mengikuti Permendagri 114/2014 Pasal 40–42. Kolom yang belum lengkap tetap bisa disimpan dan muncul sebagai catatan.</DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="min-w-0 space-y-5" noValidate>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={LABELS} />

          <fieldset className="min-w-0 space-y-3">
            <legend className="text-sm font-semibold">Kegiatan</legend>
            {data.document.plan ? (
              <div className="space-y-1.5">
                <Label htmlFor="ac-rpjmProgramId">Ambil dari program RPJM Desa (opsional)</Label>
                <SearchSelect {...common("rpjmProgramId")} className={SELECT_CLASS} value={f.rpjmProgramId} onChange={(e) => pickProgram(e.target.value)}>
                  <option value="">{programs.length ? "Tidak dari RPJM Desa / pilih program…" : `Belum ada program RPJM Desa tahun ${data.document.year}`}</option>
                  {programs.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.fieldCode}. {x.title}
                      {x.used > 0 ? ` (sudah dipakai ${x.used}×)` : ""}
                    </option>
                  ))}
                </SearchSelect>
                <p className="text-sm text-muted-foreground">
                  {editing ? "Mengganti pilihan hanya mengubah tautan; isian di bawah tidak ditimpa." : "Memilih program mengisi nama, kode, lokasi, anggaran, sumber dana, cara, dan volume; semuanya tetap bisa diubah. Boleh dikosongkan untuk kegiatan di luar RPJM Desa."}
                </p>
                {errNode("rpjmProgramId")}
              </div>
            ) : null}
            {text("title", "Nama kegiatan *", 255, "Contoh: Rabat jalan Dusun Krajan")}
            <div className="space-y-1.5">
              <Label htmlFor="ac-activityCode">Bidang/kegiatan (Permendagri 20/2018)</Label>
              <SearchSelect {...common("activityCode")} className={SELECT_CLASS} value={f.activityCode} onChange={(e) => set({ activityCode: e.target.value })}>
                <option value="">Pilih kegiatan…</option>
                {data.terms.activityCodes.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </SearchSelect>
              {errNode("activityCode")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ac-description">Uraian</Label>
              <Textarea {...common("description")} rows={2} maxLength={2000} value={f.description} onChange={(e) => set({ description: e.target.value })} />
              {errNode("description")}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {text("location", "Lokasi", 255)}
              <div className="space-y-1.5">
                <Label htmlFor="ac-estimatedBudget">Anggaran</Label>
                <CurrencyInput {...common("estimatedBudget")} inputClassName="h-11" value={f.estimatedBudget} onValueChange={(v) => set({ estimatedBudget: v })} />
                {errNode("estimatedBudget")}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ac-fundSource">Sumber dana</Label>
                <SearchSelect {...common("fundSource")} className={SELECT_CLASS} value={f.fundSource} onChange={(e) => set({ fundSource: e.target.value })}>
                  <option value="">Pilih sumber…</option>
                  {Object.entries(data.terms.paguSources).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </SearchSelect>
                {errNode("fundSource")}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ac-method">Cara pelaksanaan</Label>
                <SearchSelect {...common("method")} className={SELECT_CLASS} value={f.method} onChange={(e) => set({ method: e.target.value })}>
                  <option value="">Pilih cara…</option>
                  {Object.entries(data.terms.methods).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </SearchSelect>
                {errNode("method")}
              </div>
            </div>
          </fieldset>

          <fieldset className="min-w-0 space-y-3">
            <legend className="text-sm font-semibold">Keluaran</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              {text("outputName", "Keluaran", 200, "Contoh: Jalan rabat beton")}
              <div className="space-y-1.5">
                <Label htmlFor="ac-outputVolume">Volume</Label>
                <Input {...common("outputVolume")} className="h-11" inputMode="decimal" value={f.outputVolume} onChange={(e) => set({ outputVolume: e.target.value })} />
                {errNode("outputVolume")}
              </div>
              {text("outputUnit", "Satuan", 30, "meter, unit, orang…")}
            </div>
          </fieldset>

          <fieldset className="min-w-0 space-y-3">
            <legend className="text-sm font-semibold">Pelaksana kegiatan (Pasal 40)</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              {text("executorChair", "Ketua", 150)}
              {text("executorSecretary", "Sekretaris", 150)}
              {text("executorTreasurer", "Bendahara", 150)}
            </div>
            {text("executorMembers", "Anggota pelaksana", 500)}
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" className="size-5" checked={f.executorHasWoman} onChange={(e) => set({ executorHasWoman: e.target.checked })} />
              Pelaksana kegiatan mengikutsertakan perempuan
            </label>
          </fieldset>

          <fieldset className="min-w-0 space-y-3">
            <legend className="text-sm font-semibold">Verifikasi dan usulan</legend>
            <div className="space-y-1.5 sm:max-w-xs">
              <Label htmlFor="ac-rabVerifiedAt">Tanggal rencana kegiatan dan RAB diverifikasi (Pasal 42)</Label>
              <Input {...common("rabVerifiedAt")} className="h-11" type="date" value={f.rabVerifiedAt} onChange={(e) => set({ rabVerifiedAt: e.target.value })} />
              {errNode("rabVerifiedAt")}
            </div>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" className="size-5" checked={f.proposeToRegency} onChange={(e) => set({ proposeToRegency: e.target.checked })} />
              Ajukan sebagai usulan ke bupati/wali kota
            </label>
          </fieldset>

          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" className="min-h-11" disabled={busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
