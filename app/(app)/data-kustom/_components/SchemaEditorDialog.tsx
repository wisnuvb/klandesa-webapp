"use client";

import { useRef, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PII_CLASSES, PII_LABEL, FIELD_TYPE_LABEL, type PiiClass, type SchemaDiff } from "@/lib/custom-data/schema";
import { describeDiff, diffWarnings, fieldPayload, newFieldForm, type FieldForm } from "@/lib/custom-data/ui-model";
import { FieldBuilder, SELECT_CLASS } from "./FieldBuilder";
import type { TableDetailView } from "./types";
import { SearchSelect } from "@/components/ui/search-select";

interface Edit {
  label: string;
  pii: PiiClass;
  archive: boolean;
  moreOptions: string;
}

export function SchemaEditorDialog({ table, maxFields, onClose, onApplied }: { table: TableDetailView; maxFields: number; onClose: () => void; onApplied: () => void }) {
  const active = table.fields.filter((f) => !f.isArchived);
  const [name, setName] = useState(table.name);
  const [description, setDescription] = useState(table.description ?? "");
  const [edits, setEdits] = useState<Record<string, Edit>>(() => Object.fromEntries(active.map((f) => [f.key, { label: f.label, pii: f.piiClass, archive: false, moreOptions: "" }])));
  const [added, setAdded] = useState<FieldForm[]>([]);
  const [preview, setPreview] = useState<SchemaDiff | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const summaryRef = useRef<HTMLDivElement>(null);

  const patch = (key: string, p: Partial<Edit>) => {
    setPreview(null);
    setEdits((e) => ({ ...e, [key]: { ...e[key], ...p } }));
  };

  function buildChange() {
    const renameFields: Record<string, string> = {};
    const setPii: Record<string, PiiClass> = {};
    const archiveFields: string[] = [];
    const addOptions: Record<string, string[]> = {};
    for (const f of active) {
      const e = edits[f.key];
      if (e.label.trim() !== f.label) renameFields[f.key] = e.label;
      if (e.pii !== f.piiClass) setPii[f.key] = e.pii;
      if (e.archive) archiveFields.push(f.key);
      const more = e.moreOptions.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
      if (f.type === "select" && more.length) addOptions[f.key] = more;
    }
    return {
      ...(name.trim() !== table.name ? { name } : {}),
      ...(description.trim() !== (table.description ?? "") ? { description } : {}),
      addFields: added.filter((f) => f.label.trim() || f.optionsText.trim()).map(fieldPayload),
      renameFields,
      setPii,
      archiveFields,
      addOptions,
    };
  }

  async function send(dryRun: boolean) {
    setBusy(true);
    setErrors([]);
    try {
      const res = await fetch(`/api/custom-data/tables/${table.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...buildChange(), dryRun }) });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        setErrors(Array.isArray(j?.errors) && j.errors.length ? j.errors : [typeof j?.error === "string" ? j.error : "Gagal memproses. Coba lagi."]);
        queueMicrotask(() => summaryRef.current?.focus());
        return;
      }
      if (dryRun) setPreview(j.diff as SchemaDiff);
      else {
        onApplied();
        onClose();
      }
    } catch {
      setErrors(["Tidak bisa terhubung. Periksa koneksi lalu coba lagi."]);
    } finally {
      setBusy(false);
    }
  }

  const lines = preview ? describeDiff(preview, table.fields) : [];
  const warnings = preview ? diffWarnings(preview, table.fields) : [];

  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ubah susunan tabel</DialogTitle>
          <DialogDescription>Kolom tidak dihapus, hanya diarsipkan (isinya tetap aman). Jenis isian tidak bisa diubah. Tekan &quot;Lihat ringkasan&quot; untuk memeriksa sebelum diterapkan.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="se-nama">Nama tabel</Label>
              <Input id="se-nama" className="h-11" value={name} maxLength={100} onChange={(e) => { setPreview(null); setName(e.target.value); }} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="se-ket">Keterangan</Label>
              <Input id="se-ket" className="h-11" value={description} maxLength={500} onChange={(e) => { setPreview(null); setDescription(e.target.value); }} />
            </div>
          </div>

          <section aria-labelledby="se-kolom" className="space-y-3">
            <h3 id="se-kolom" className="font-semibold">
              Kolom yang ada
            </h3>
            {active.map((f) => {
              const e = edits[f.key];
              return (
                <fieldset key={f.key} className={`space-y-3 rounded-md border p-4 ${e.archive ? "opacity-60" : ""}`}>
                  <legend className="px-1 text-sm font-medium">
                    {f.label} <span className="font-normal text-muted-foreground">· {FIELD_TYPE_LABEL[f.type]}{f.required ? " · wajib" : ""}</span>
                  </legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor={`se-${f.key}-l`}>Nama kolom</Label>
                      <Input id={`se-${f.key}-l`} className="h-11" value={e.label} maxLength={100} onChange={(ev) => patch(f.key, { label: ev.target.value })} disabled={e.archive} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`se-${f.key}-p`}>Jenis data</Label>
                      <SearchSelect id={`se-${f.key}-p`} className={SELECT_CLASS} value={e.pii} onChange={(ev) => patch(f.key, { pii: ev.target.value as PiiClass })} disabled={e.archive}>
                        {PII_CLASSES.map((c) => (
                          <option key={c} value={c}>
                            {PII_LABEL[c].label}
                          </option>
                        ))}
                      </SearchSelect>
                    </div>
                  </div>
                  {f.type === "select" ? (
                    <div className="space-y-1.5">
                      <p className="text-sm text-muted-foreground">Pilihan sekarang: {(Array.isArray(f.options) ? (f.options as string[]) : []).join(", ")}</p>
                      <Label htmlFor={`se-${f.key}-o`}>Tambah pilihan</Label>
                      <Input id={`se-${f.key}-o`} className="h-11" value={e.moreOptions} onChange={(ev) => patch(f.key, { moreOptions: ev.target.value })} placeholder="Pisahkan dengan koma" disabled={e.archive} />
                    </div>
                  ) : null}
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input type="checkbox" className="size-5" checked={e.archive} onChange={(ev) => patch(f.key, { archive: ev.target.checked })} />
                    Arsipkan kolom ini (disembunyikan, isinya tidak dihapus)
                  </label>
                </fieldset>
              );
            })}
          </section>

          <section aria-labelledby="se-baru" className="space-y-3">
            <h3 id="se-baru" className="font-semibold">
              Tambah kolom baru
            </h3>
            {table.recordCount > 0 ? <p className="text-sm text-muted-foreground">Tabel ini sudah berisi data, jadi kolom baru tidak bisa wajib diisi.</p> : null}
            {added.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada kolom baru.</p> : null}
            {added.length > 0 ? <FieldBuilder fields={added} onChange={(f) => { setPreview(null); setAdded(f); }} maxFields={maxFields} idPrefix="tambah" /> : null}
            <Button type="button" variant="outline" className="min-h-11" onClick={() => { setPreview(null); setAdded((a) => [...a, newFieldForm()]); }}>
              Tambah kolom
            </Button>
          </section>

          {errors.length ? (
            <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive outline-none">
              <p className="font-medium">Belum bisa diterapkan:</p>
              <ul className="list-disc pl-5">
                {errors.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {preview ? (
            <section aria-labelledby="se-ringkas" className="space-y-2 rounded-md border bg-muted/30 p-4">
              <h3 id="se-ringkas" className="font-semibold">
                Ringkasan perubahan
              </h3>
              {lines.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tidak ada perubahan.</p>
              ) : (
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {lines.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              )}
              {warnings.map((w) => (
                <p key={w} className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50">
                  <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  {w}
                </p>
              ))}
            </section>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>
            Batal
          </Button>
          {preview && lines.length > 0 ? (
            <Button type="button" className="min-h-11" disabled={busy} onClick={() => void send(false)}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              Terapkan perubahan
            </Button>
          ) : (
            <Button type="button" className="min-h-11" disabled={busy} onClick={() => void send(true)}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              Lihat ringkasan
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
