"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileText, Loader2, Lock, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError, FormErrorSummary, fieldA11y } from "@/components/app/FormErrorSummary";
import { useApiGet } from "@/hooks/useApiGet";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { KINDS, type ReportKind, type SectionDef } from "@/lib/laporan-desa/catalog";
import { localToday } from "@/lib/form-input";

interface Payload {
  report: {
    kind: ReportKind;
    year: number;
    status: "DRAFT" | "DISERAHKAN";
    sections: Record<string, string>;
    termEnd: string | null;
    deadline: string | null;
    submittedAt: string | null;
    submittedNote: string | null;
    missing: string[];
    suggestions: { visi_misi: string | null };
  };
  info: { to: string; basis: string };
  sections: SectionDef[];
  can: { create: boolean; update: boolean; approve: boolean };
}

const SELECT_CLASS =
  "flex h-11 w-full rounded-md border border-input bg-input-background px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm";
const dayId = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export function LaporanDesaView() {
  const thisYear = new Date().getFullYear();
  const [kind, setKind] = useState<ReportKind>("LPPD_TAHUN");
  const [year, setYear] = useState(thisYear - 1);
  const { data, loading, error, reload } = useApiGet<Payload>(`/api/laporan-desa?kind=${kind}&year=${year}`);
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 text-2xl font-semibold"><ScrollText aria-hidden="true" className="size-6" />Laporan Kepala Desa</h1>
        <p className="max-w-prose text-muted-foreground">
          LPPD, LKPPD, dan LPPD akhir masa jabatan menurut Permendagri 46/2016. Susunan bagiannya mengikuti pasal-pasalnya; Anda menulis uraiannya, sedangkan rincian APB Desa dan rekapitulasi penduduk dilampirkan otomatis dari data aplikasi.
        </p>
      </header>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1">
          <label htmlFor="ld-kind" className="mb-1.5 block text-sm font-medium">Jenis laporan</label>
          <select id="ld-kind" className={SELECT_CLASS} value={kind} onChange={(e) => setKind(e.target.value as ReportKind)}>
            {(Object.keys(KINDS) as ReportKind[]).map((k) => <option key={k} value={k}>{KINDS[k]}</option>)}
          </select>
        </div>
        <div className="w-40">
          <label htmlFor="ld-year" className="mb-1.5 block text-sm font-medium">{kind === "LPPD_JABATAN" ? "Tahun penyusunan" : "Tahun anggaran"}</label>
          <select id="ld-year" className={SELECT_CLASS} value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {Array.from({ length: 8 }, (_, k) => thisYear - k).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>
      {loading ? <p role="status" className="flex items-center gap-2 p-6 text-muted-foreground"><Loader2 aria-hidden="true" className="size-5 animate-spin" />Memuat…</p> : null}
      {error ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          <p>{error}</p>
          <Button type="button" variant="outline" className="min-h-11" onClick={reload}>Coba lagi</Button>
        </div>
      ) : null}
      {data ? <Editor key={`${kind}-${year}-${data.report.status}`} data={data} reload={reload} /> : null}
    </div>
  );
}

function Editor({ data, reload }: { data: Payload; reload: () => void }) {
  const { report, info, sections, can } = data;
  const locked = report.status === "DISERAHKAN";
  const editable = can.update && !locked;
  const [vals, setVals] = useState<Record<string, string>>(() => ({ ...report.sections }));
  const [saved, setSaved] = useState<Record<string, string>>(() => ({ ...report.sections }));
  const [dlg, setDlg] = useState<"submit" | "reopen" | null>(null);
  const save = useFormSubmit();
  const dirty = useMemo(() => Object.keys({ ...vals, ...saved }).some((k) => (vals[k] ?? "") !== (saved[k] ?? "")), [vals, saved]);
  const groups = useMemo(() => [...new Set(sections.map((s) => s.group))], [sections]);
  const notice = useRef<HTMLParagraphElement>(null);
  const [justSaved, setJustSaved] = useState(false);

  // Peringatan sebelum meninggalkan halaman dengan perubahan yang belum disimpan.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  async function onSave() {
    setJustSaved(false);
    const changed = Object.fromEntries(Object.keys({ ...vals, ...saved }).filter((k) => (vals[k] ?? "") !== (saved[k] ?? "")).map((k) => [k, vals[k] ?? ""]));
    const r = await save.submit(`/api/laporan-desa?kind=${report.kind}&year=${report.year}`, "PUT", { sections: changed });
    if (r) {
      setSaved({ ...vals });
      setJustSaved(true);
      reload();
      queueMicrotask(() => notice.current?.focus());
    }
  }

  const unfilled = sections.filter((s) => s.required && !(vals[s.id] ?? "").trim()).length;

  return (
    <div className="space-y-6">
      <section className="space-y-1 rounded-lg border bg-card p-4 text-sm">
        <p><strong>Disampaikan kepada:</strong> {info.to}</p>
        <p className="text-muted-foreground">{info.basis}</p>
        {report.deadline ? <p><strong>Tenggat:</strong> {dayId(report.deadline)}</p> : report.kind === "LPPD_JABATAN" ? <p className="text-muted-foreground">Isi tanggal berakhirnya masa jabatan untuk menghitung tenggat.</p> : null}
        <p className="flex items-center gap-1.5">
          {locked ? <Lock aria-hidden="true" className="size-4" /> : <FileText aria-hidden="true" className="size-4" />}
          {locked ? `Sudah diserahkan ${report.submittedAt ? dayId(report.submittedAt) : ""}${report.submittedNote ? ` · ${report.submittedNote}` : ""}` : `Draf · ${unfilled} bagian wajib belum diisi`}
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" className="min-h-11"><Link href={`/laporan-kepala-desa/cetak?kind=${report.kind}&year=${report.year}`}>Pratinjau dan cetak</Link></Button>
        {report.kind !== "LPPD_JABATAN" ? <Button asChild variant="ghost" className="min-h-11"><Link href="/apbdes">Laporan keuangan (APBDes)</Link></Button> : null}
        {!locked && can.approve ? <Button type="button" className="min-h-11" disabled={dirty} onClick={() => setDlg("submit")}><CheckCircle2 aria-hidden="true" />Tandai diserahkan</Button> : null}
        {locked && can.approve ? <Button type="button" variant="ghost" className="min-h-11" onClick={() => setDlg("reopen")}>Buka kembali</Button> : null}
      </div>
      {dirty && can.approve && !locked ? <p className="text-sm text-muted-foreground">Simpan perubahan dulu sebelum menandai diserahkan.</p> : null}

      <FormErrorSummary innerRef={save.summaryRef} errors={save.errors} general={save.general} labels={Object.fromEntries(sections.map((s) => [s.id, s.title]))} />
      <p ref={notice} tabIndex={-1} role="status" className="text-sm text-emerald-800 outline-none dark:text-emerald-300">{justSaved ? "Perubahan tersimpan." : ""}</p>

      {report.kind === "LPPD_JABATAN" ? (
        <div className="max-w-xs space-y-1.5">
          <Label htmlFor="ld-term">Masa jabatan berakhir pada</Label>
          <Input {...fieldA11y("ld-term", save.errors.masa_jabatan_berakhir)} className="h-11" type="date" disabled={!editable} value={vals.masa_jabatan_berakhir ?? ""} onChange={(e) => setVals((p) => ({ ...p, masa_jabatan_berakhir: e.target.value }))} />
          <FieldError id="ld-term" message={save.errors.masa_jabatan_berakhir} />
        </div>
      ) : null}

      {groups.map((g) => (
        <fieldset key={g} className="space-y-4 rounded-lg border p-4">
          <legend className="px-1 font-semibold">{g}</legend>
          {sections.filter((s) => s.group === g).map((s) => (
            <div key={s.id} className="space-y-1.5">
              <Label htmlFor={`ld-${s.id}`}>{s.title}{s.required ? " *" : ""}</Label>
              <p id={`ld-${s.id}-hint`} className="text-sm text-muted-foreground">{s.hint}</p>
              <Textarea id={`ld-${s.id}`} aria-describedby={`ld-${s.id}-hint`} aria-invalid={save.errors[s.id] ? true : undefined} rows={5} maxLength={20000} disabled={!editable} value={vals[s.id] ?? ""} onChange={(e) => setVals((p) => ({ ...p, [s.id]: e.target.value }))} />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <FieldError id={`ld-${s.id}`} message={save.errors[s.id]} />
                {s.id === "visi_misi" && editable && report.suggestions.visi_misi && !(vals.visi_misi ?? "").trim() ? (
                  <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={() => setVals((p) => ({ ...p, visi_misi: report.suggestions.visi_misi ?? "" }))}>Isi dari RPJMDes</Button>
                ) : null}
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">{(vals[s.id] ?? "").length}/20000</span>
              </div>
            </div>
          ))}
        </fieldset>
      ))}

      {editable ? (
        <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center gap-3 border-t bg-background/95 p-3 backdrop-blur">
          <Button type="button" size="lg" className="min-h-11" disabled={save.busy || !dirty} onClick={onSave}>{save.busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}Simpan perubahan</Button>
          <span className="text-sm text-muted-foreground" aria-live="polite">{dirty ? "Ada perubahan yang belum disimpan." : "Tidak ada perubahan."}</span>
        </div>
      ) : null}

      {dlg === "submit" ? <SubmitDialog report={report} onClose={() => setDlg(null)} onDone={() => { setDlg(null); reload(); }} /> : null}
      {dlg === "reopen" ? <ReopenDialog report={report} onClose={() => setDlg(null)} onDone={() => { setDlg(null); reload(); }} /> : null}
    </div>
  );
}

function SubmitDialog({ report, onClose, onDone }: { report: Payload["report"]; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ submittedAt: localToday(), note: "" });
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tandai laporan diserahkan</DialogTitle>
          <DialogDescription>Setelah ditandai, isi laporan terkunci. Aplikasi hanya mencatat penyerahan; laporan tetap diserahkan secara tertulis kepada penerimanya.</DialogDescription>
        </DialogHeader>
        <form noValidate className="space-y-4" onSubmit={async (e) => { e.preventDefault(); if (await submit("/api/laporan-desa/penyerahan", "POST", { kind: report.kind, year: report.year, action: "submit", ...f })) onDone(); }}>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ submittedAt: "Tanggal", note: "Keterangan" }} />
          <div className="space-y-1.5">
            <Label htmlFor="sb-date">Tanggal penyerahan *</Label>
            <Input {...fieldA11y("sb-date", errors.submittedAt)} className="h-11" type="date" max={localToday()} value={f.submittedAt} onChange={(e) => setF((p) => ({ ...p, submittedAt: e.target.value }))} />
            <FieldError id="sb-date" message={errors.submittedAt} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sb-note">Keterangan</Label>
            <Input {...fieldA11y("sb-note", errors.note)} className="h-11" maxLength={200} value={f.note} onChange={(e) => setF((p) => ({ ...p, note: e.target.value }))} placeholder="Mis. diserahkan ke camat, tanda terima nomor…" />
            <FieldError id="sb-note" message={errors.note} />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>Batal</Button>
            <Button type="submit" className="min-h-11" disabled={busy}>{busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}Tandai diserahkan</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReopenDialog({ report, onClose, onDone }: { report: Payload["report"]; onClose: () => void; onDone: () => void }) {
  const { busy, general, summaryRef, submit } = useFormSubmit();
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Buka kembali laporan?</DialogTitle>
          <DialogDescription>Catatan penyerahan dihapus dan isi laporan dapat diubah lagi. Lakukan hanya untuk koreksi yang sah.</DialogDescription>
        </DialogHeader>
        <FormErrorSummary innerRef={summaryRef} errors={{}} general={general} labels={{}} />
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>Batal</Button>
          <Button type="button" variant="destructive" className="min-h-11" disabled={busy} onClick={async () => { if (await submit("/api/laporan-desa/penyerahan", "POST", { kind: report.kind, year: report.year, action: "reopen" })) onDone(); }}>{busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}Buka kembali</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
