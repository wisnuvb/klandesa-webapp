"use client";

import { useMemo, useState } from "react";
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
import { Pill, SELECT_CLASS, rupiah } from "@/components/app/perencanaan/shared";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import type { DetailResponse, ProgramView } from "./types";

export function ProgramsTab({ data, editable, canDelete, reload }: { data: DetailResponse; editable: boolean; canDelete: boolean; reload: () => void }) {
  const p = data.plan;
  const [editing, setEditing] = useState<ProgramView | "new" | null>(null);
  const [yearFilter, setYearFilter] = useState("");
  const years = useMemo(() => p.matrix.years, [p.matrix.years]);
  const rows = p.programs.filter((x) => !yearFilter || String(x.year) === yearFilter);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <div className="flex gap-1.5">
            <dt className="text-muted-foreground">Program:</dt>
            <dd className="font-medium">{p.summary.count}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-muted-foreground">Anggaran indikatif:</dt>
            <dd className="font-medium">{rupiah(p.summary.totalBudget)}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-muted-foreground">Lengkap:</dt>
            <dd className="font-medium">
              {p.summary.complete}/{p.summary.count}
            </dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-muted-foreground">Sudah dijabarkan ke RKP Desa:</dt>
            <dd className="font-medium">{p.summary.linkedToRkp}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="pr-year-filter">Tampilkan tahun</Label>
            <SearchSelect id="pr-year-filter" className={`${SELECT_CLASS} w-40`} value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
              <option value="">Semua tahun</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </SearchSelect>
          </div>
          {editable ? (
            <Button type="button" className="min-h-11" onClick={() => setEditing("new")}>
              <Plus aria-hidden="true" />
              Tambah program
            </Button>
          ) : null}
        </div>
      </div>

      {p.programs.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Belum ada program. Tambahkan program dan kegiatan hasil pengkajian keadaan desa dan Musyawarah Desa, dikelompokkan per bidang dan per tahun pelaksanaan.
        </p>
      ) : (
        Object.entries(data.terms.fields).map(([code, label]) => {
          const list = rows.filter((x) => x.fieldCode === code);
          return (
            <section key={code} aria-labelledby={`pr-f-${code}`} className="space-y-2">
              <h3 id={`pr-f-${code}`} className="text-base font-semibold">
                Bidang {code}. {label} <span className="font-normal text-muted-foreground">({list.length})</span>
              </h3>
              {list.length === 0 ? (
                <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">Belum ada program pada bidang ini{yearFilter ? ` untuk tahun ${yearFilter}` : ""}.</p>
              ) : (
                <ul className="space-y-3">
                  {list.map((a) => (
                    <li key={a.id} className="min-w-0 space-y-2 rounded-lg border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 space-y-0.5">
                          <p className="break-words font-medium">{a.title}</p>
                          <p className="break-words text-sm text-muted-foreground">{a.activityCode ? `${a.activityCode} ${a.activityName ?? ""}` : "Kode kegiatan belum dipilih"}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Pill tone="neutral">Tahun {a.year}</Pill>
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
                          {a.rkpCount > 0 ? <Pill tone="info">Dijabarkan ke {a.rkpCount} kegiatan RKP Desa</Pill> : null}
                        </div>
                      </div>
                      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <dt className="text-muted-foreground">Anggaran indikatif</dt>
                          <dd>{rupiah(a.budget)}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Sumber dana</dt>
                          <dd>{a.fundSource ? data.terms.paguSources[a.fundSource] ?? a.fundSource : "-"}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Pola pelaksanaan</dt>
                          <dd>{a.method ? data.terms.methods[a.method] ?? a.method : "-"}</dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="text-muted-foreground">Volume dan lokasi</dt>
                          <dd className="break-words">
                            {a.outputVolume ? `${a.outputVolume.replace(/\.00$/, "")} ${a.outputUnit ?? ""}` : "-"}
                            {a.location ? ` · ${a.location}` : ""}
                          </dd>
                        </div>
                      </dl>
                      {a.benefit ? <p className="break-words text-sm">Sasaran/manfaat: {a.benefit}</p> : null}
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
                              label={`Hapus program ${a.title}`}
                              buttonText="Hapus"
                              title="Hapus program ini?"
                              description={`Program "${a.title}" (tahun ${a.year}, bidang ${a.fieldCode}) akan dihapus dari RPJM Desa dan anggarannya keluar dari matriks.${a.rkpCount > 0 ? ` Program ini sudah dijabarkan ke ${a.rkpCount} kegiatan RKP Desa: tautannya dilepas, kegiatan RKP Desa tetap ada.` : ""} Tindakan ini tidak dapat dibatalkan.`}
                              url={`/api/perencanaan/rpjm/${p.id}/program/${a.id}`}
                              onDone={reload}
                            />
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })
      )}

      {editing ? <ProgramDialog data={data} program={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} /> : null}
    </>
  );
}

interface Form {
  fieldCode: string;
  year: string;
  title: string;
  activityCode: string;
  description: string;
  location: string;
  budget: string;
  fundSource: string;
  method: string;
  outputVolume: string;
  outputUnit: string;
  benefit: string;
}

const LABELS: Record<string, string> = {
  fieldCode: "Bidang",
  year: "Tahun pelaksanaan",
  title: "Nama program/kegiatan",
  activityCode: "Kegiatan (kode)",
  description: "Uraian",
  location: "Lokasi",
  budget: "Anggaran indikatif",
  fundSource: "Sumber dana",
  method: "Pola pelaksanaan",
  outputVolume: "Volume",
  outputUnit: "Satuan",
  benefit: "Sasaran/manfaat",
};

function ProgramDialog({ data, program, onClose, onSaved }: { data: DetailResponse; program: ProgramView | null; onClose: () => void; onSaved: () => void }) {
  const editing = program !== null;
  const p = data.plan;
  const [f, setF] = useState<Form>({
    fieldCode: program?.fieldCode ?? "2",
    year: String(program?.year ?? p.periodStart),
    title: program?.title ?? "",
    activityCode: program?.activityCode ?? "",
    description: program?.description ?? "",
    location: program?.location ?? "",
    budget: program?.budget ? program.budget.replace(/\.00$/, "") : "",
    fundSource: program?.fundSource ?? "",
    method: program?.method ?? "",
    outputVolume: program?.outputVolume ? program.outputVolume.replace(/\.00$/, "") : "",
    outputUnit: program?.outputUnit ?? "",
    benefit: program?.benefit ?? "",
  });
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const set = (x: Partial<Form>) => setF((v) => ({ ...v, ...x }));
  const base = `/api/perencanaan/rpjm/${p.id}/program`;
  const codes = data.terms.activityCodes.filter((c) => c.code.startsWith(`${f.fieldCode}.`));

  async function go(e: React.FormEvent) {
    e.preventDefault();
    const r = await submit(editing ? `${base}/${program!.id}` : base, editing ? "PATCH" : "POST", f);
    if (r) onSaved();
  }
  const err = (k: string) => errors[k];
  const common = (k: keyof Form) => ({ id: `pg-${k}`, "aria-invalid": err(k) ? true : undefined, "aria-describedby": err(k) ? `pg-${k}-err` : undefined });
  const errNode = (k: string) => (err(k) ? <p id={`pg-${k}-err`} className="text-sm text-destructive">{err(k)}</p> : null);
  const text = (k: keyof Form, label: string, max: number, ph?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`pg-${k}`}>{label}</Label>
      <Input {...common(k)} className="h-11" maxLength={max} value={f[k]} onChange={(e) => set({ [k]: e.target.value } as Partial<Form>)} placeholder={ph} />
      {errNode(k)}
    </div>
  );
  const years: number[] = [];
  for (let y = p.periodStart; y <= p.periodEnd; y++) years.push(y);

  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Ubah program" : "Tambah program"}</DialogTitle>
          <DialogDescription>Isian mengikuti unsur rancangan RPJM Desa (Permendesa PDTT 21/2020 Pasal 30 ayat 3). Kolom yang belum lengkap tetap bisa disimpan dan muncul sebagai catatan.</DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="min-w-0 space-y-5" noValidate>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={LABELS} />
          <fieldset className="min-w-0 space-y-3">
            <legend className="text-sm font-semibold">Program dan waktu</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pg-fieldCode">Bidang *</Label>
                <SearchSelect {...common("fieldCode")} className={SELECT_CLASS} value={f.fieldCode} onChange={(e) => set({ fieldCode: e.target.value, activityCode: "" })}>
                  {Object.entries(data.terms.fields).map(([k, v]) => (
                    <option key={k} value={k}>
                      {k}. {v}
                    </option>
                  ))}
                </SearchSelect>
                {errNode("fieldCode")}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pg-year">Tahun pelaksanaan *</Label>
                <SearchSelect {...common("year")} className={SELECT_CLASS} value={f.year} onChange={(e) => set({ year: e.target.value })}>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </SearchSelect>
                {errNode("year")}
              </div>
            </div>
            {text("title", "Nama program/kegiatan *", 255, "Contoh: Rabat jalan Dusun Krajan")}
            <div className="space-y-1.5">
              <Label htmlFor="pg-activityCode">Kegiatan pada bidang ini (Permendagri 20/2018)</Label>
              <SearchSelect {...common("activityCode")} className={SELECT_CLASS} value={f.activityCode} onChange={(e) => set({ activityCode: e.target.value })}>
                <option value="">Pilih kegiatan…</option>
                {codes.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </SearchSelect>
              {errNode("activityCode")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pg-description">Uraian</Label>
              <Textarea {...common("description")} rows={2} maxLength={2000} value={f.description} onChange={(e) => set({ description: e.target.value })} />
              {errNode("description")}
            </div>
          </fieldset>
          <fieldset className="min-w-0 space-y-3">
            <legend className="text-sm font-semibold">Anggaran dan pelaksanaan</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pg-budget">Anggaran indikatif (tahun ini)</Label>
                <CurrencyInput {...common("budget")} inputClassName="h-11" value={f.budget} onValueChange={(v) => set({ budget: v })} />
                {errNode("budget")}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pg-fundSource">Sumber pembiayaan</Label>
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
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="pg-method">Pola pelaksanaan</Label>
                <SearchSelect {...common("method")} className={SELECT_CLASS} value={f.method} onChange={(e) => set({ method: e.target.value })}>
                  <option value="">Pilih pola…</option>
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
            <legend className="text-sm font-semibold">Lokasi, volume, dan manfaat</legend>
            {text("location", "Lokasi", 255)}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pg-outputVolume">Perkiraan volume</Label>
                <Input {...common("outputVolume")} className="h-11" inputMode="decimal" value={f.outputVolume} onChange={(e) => set({ outputVolume: e.target.value })} />
                {errNode("outputVolume")}
              </div>
              {text("outputUnit", "Satuan", 30, "meter, unit, orang…")}
            </div>
            {text("benefit", "Sasaran/manfaat", 300, "Contoh: 120 keluarga di Dusun Krajan")}
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
