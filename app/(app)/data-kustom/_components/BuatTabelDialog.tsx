"use client";

import { useRef, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FIELD_TYPE_LABEL, PII_LABEL } from "@/lib/custom-data/schema";
import { fieldPayload, newFieldForm, summarizeNewTable, TEMPLATES, templateFields, type FieldForm } from "@/lib/custom-data/ui-model";
import { FieldBuilder } from "./FieldBuilder";

export function BuatTabelDialog({ maxFields, onClose, onCreated }: { maxFields: number; onClose: () => void; onCreated: (id: number) => void }) {
  const [step, setStep] = useState<"edit" | "preview">("edit");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [linkResident, setLinkResident] = useState(false);
  const [fields, setFields] = useState<FieldForm[]>([newFieldForm()]);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const summaryRef = useRef<HTMLDivElement>(null);

  const body = () => ({ name, description, linkResident, fields: fields.map(fieldPayload) });
  const summary = summarizeNewTable(fields);

  function applyTemplate(id: string) {
    const t = TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setName(t.name);
    setDescription(t.description);
    setLinkResident(t.linkResident);
    setFields(templateFields(t));
    setErrors([]);
  }

  function toPreview() {
    const errs: string[] = [];
    if (!name.trim()) errs.push("Isi nama tabel.");
    if (fields.some((f) => !f.label.trim())) errs.push("Semua kolom perlu diberi nama.");
    if (fields.some((f) => f.type === "select" && f.optionsText.split("\n").filter((l) => l.trim()).length < 2)) errs.push("Kolom pilihan perlu minimal 2 pilihan.");
    if (errs.length) {
      setErrors(errs);
      queueMicrotask(() => summaryRef.current?.focus());
      return;
    }
    setErrors([]);
    setStep("preview");
  }

  async function create() {
    setBusy(true);
    setErrors([]);
    try {
      const res = await fetch("/api/custom-data/tables", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body()) });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        setErrors(Array.isArray(j?.errors) && j.errors.length ? j.errors : [typeof j?.error === "string" ? j.error : "Gagal membuat tabel. Coba lagi."]);
        setStep("edit");
        queueMicrotask(() => summaryRef.current?.focus());
        return;
      }
      onCreated(j.id);
    } catch {
      setErrors(["Tidak bisa terhubung. Periksa koneksi lalu coba lagi."]);
    } finally {
      setBusy(false);
    }
  }

  const errorBox = errors.length ? (
    <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive outline-none">
      <p className="font-medium">Belum bisa dilanjutkan:</p>
      <ul className="list-disc pl-5">
        {errors.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
    </div>
  ) : null;

  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        {step === "edit" ? (
          <>
            <DialogHeader>
              <DialogTitle>Buat tabel baru</DialogTitle>
              <DialogDescription>Tentukan nama tabel dan kolom-kolomnya. Langkah berikutnya menampilkan ringkasan sebelum tabel dibuat.</DialogDescription>
            </DialogHeader>

            <section aria-label="Contoh siap pakai" className="space-y-2">
              <p className="text-sm font-medium">Mulai dari contoh (bisa diubah):</p>
              <ul className="flex flex-wrap gap-2">
                {TEMPLATES.map((t) => (
                  <li key={t.id}>
                    <Button type="button" variant="outline" className="min-h-11" onClick={() => applyTemplate(t.id)}>
                      {t.name}
                    </Button>
                  </li>
                ))}
              </ul>
            </section>

            <form onSubmit={(e) => { e.preventDefault(); toPreview(); }} className="space-y-5" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="tabel-nama">Nama tabel</Label>
                <Input id="tabel-nama" className="h-11" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Penerima bantuan beras" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tabel-ket">Keterangan (opsional)</Label>
                <Textarea id="tabel-ket" rows={2} value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <label className="flex min-h-11 cursor-pointer gap-3 rounded-md border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <input type="checkbox" className="mt-0.5 size-5 shrink-0" checked={linkResident} onChange={(e) => setLinkResident(e.target.checked)} />
                <span>
                  <span className="block font-medium">Tiap baris terkait satu warga</span>
                  <span className="block text-sm text-muted-foreground">Cocok untuk daftar penerima atau pendataan orang. Warga dipilih dari Data Warga, jadi nama tidak perlu diketik lagi.</span>
                </span>
              </label>

              <section aria-labelledby="kolom-title" className="space-y-3">
                <h3 id="kolom-title" className="font-semibold">
                  Kolom
                </h3>
                <FieldBuilder fields={fields} onChange={setFields} maxFields={maxFields} idPrefix="baru" />
              </section>

              {errorBox}
              <DialogFooter className="gap-2 sm:gap-2">
                <Button type="button" variant="outline" className="min-h-11" onClick={onClose}>
                  Batal
                </Button>
                <Button type="submit" className="min-h-11">
                  Lihat ringkasan
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Periksa sebelum membuat</DialogTitle>
              <DialogDescription>Tabel ini bisa ditambah kolom nanti, tetapi jenis isian kolom tidak bisa diubah dan kolom tidak bisa dihapus (hanya diarsipkan).</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-md border p-4">
                <p className="font-semibold">{name.trim()}</p>
                {description.trim() ? <p className="text-sm text-muted-foreground">{description.trim()}</p> : null}
                <p className="mt-1 text-sm">{linkResident ? "Tiap baris terkait satu warga." : "Baris tidak terkait warga tertentu."}</p>
              </div>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">Kolom tabel {name.trim()}</caption>
                  <thead className="bg-muted/50">
                    <tr>
                      <th scope="col" className="p-3 font-medium">Kolom</th>
                      <th scope="col" className="p-3 font-medium">Jenis</th>
                      <th scope="col" className="p-3 font-medium">Wajib</th>
                      <th scope="col" className="p-3 font-medium">Jenis data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {fields.map((f) => (
                      <tr key={f.uid}>
                        <td className="p-3 font-medium">{f.label.trim()}</td>
                        <td className="p-3">{FIELD_TYPE_LABEL[f.type]}</td>
                        <td className="p-3">{f.required ? "Ya" : "Tidak"}</td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1.5">
                            {f.piiClass === "NONE" ? <Eye aria-hidden="true" className="size-4" /> : <EyeOff aria-hidden="true" className="size-4" />}
                            {PII_LABEL[f.piiClass].label}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-50">
                <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <div>
                  <p>
                    <strong>{summary.closed.length}</strong> dari {summary.total} kolom ditandai data pribadi
                    {summary.closed.length ? ` (${summary.closed.join(", ")})` : ""} dan <strong>tidak akan pernah keluar lewat API</strong>.
                  </p>
                  <p className="mt-1">
                    {summary.open.length ? `Kolom yang boleh dibaca aplikasi lain (bila kuncinya diberi akses data kustom): ${summary.open.join(", ")}.` : "Tidak ada kolom yang terbuka untuk API."}
                  </p>
                </div>
              </div>
              {errorBox}
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={() => setStep("edit")}>
                <ArrowLeft aria-hidden="true" />
                Kembali mengubah
              </Button>
              <Button type="button" className="min-h-11" disabled={busy} onClick={() => void create()}>
                {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
                {busy ? "Membuat…" : "Buat tabel"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
