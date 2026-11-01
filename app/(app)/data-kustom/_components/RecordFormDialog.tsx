"use client";

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ResidentPicker } from "@/components/app/ResidentPicker";
import type { ResidentPick } from "@/lib/kependudukan/mutasi-labels";
import type { FieldDef } from "@/lib/custom-data/schema";
import { PII_LABEL } from "@/lib/custom-data/schema";
import { SELECT_CLASS } from "./FieldBuilder";
import type { RecordRowView, TableDetailView } from "./types";
import { SearchSelect } from "@/components/ui/search-select";

type Values = Record<string, string>;

const initial = (fields: FieldDef[], data: Record<string, unknown>): Values =>
  Object.fromEntries(fields.map((f) => [f.key, data[f.key] === undefined || data[f.key] === null ? "" : f.type === "boolean" ? (data[f.key] === true ? "ya" : "tidak") : String(data[f.key])]));

/** Nilai isian → nilai API. Kosong → null (mengosongkan kolom opsional saat mengubah). */
function toApi(f: FieldDef, v: string): unknown {
  if (v === "") return null;
  if (f.type === "boolean") return v === "ya";
  return v;
}

export function RecordFormDialog({ table, record, onClose, onSaved }: { table: TableDetailView; record: RecordRowView | null; onClose: () => void; onSaved: () => void }) {
  const fields = table.fields.filter((f) => !f.isArchived);
  const [values, setValues] = useState<Values>(() => initial(fields, record?.data ?? {}));
  const [resident, setResident] = useState<ResidentPick | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [general, setGeneral] = useState<string[]>([]);
  const summaryRef = useRef<HTMLDivElement>(null);
  const editing = record !== null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setGeneral([]);
    const data = Object.fromEntries(fields.map((f) => [f.key, toApi(f, values[f.key] ?? "")]));
    const residentId = table.linkResident ? (resident?.id ?? record?.resident?.id ?? null) : undefined;
    try {
      const res = await fetch(editing ? `/api/custom-data/records/${record!.id}` : `/api/custom-data/tables/${table.id}/records`, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, ...(residentId !== undefined ? { residentId } : {}) }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        const fe = (j?.fieldErrors ?? {}) as Record<string, string>;
        setErrors(fe);
        setGeneral(Object.keys(fe).length ? [] : [typeof j?.error === "string" ? j.error : "Gagal menyimpan. Coba lagi."]);
        queueMicrotask(() => summaryRef.current?.focus());
        return;
      }
      onSaved();
      onClose();
    } catch {
      setGeneral(["Tidak bisa terhubung. Periksa koneksi lalu coba lagi."]);
      queueMicrotask(() => summaryRef.current?.focus());
    } finally {
      setBusy(false);
    }
  }

  const labelOf = (key: string) => fields.find((f) => f.key === key)?.label ?? key;
  const errorKeys = Object.keys(errors);

  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Ubah data" : "Tambah data"} · {table.name}</DialogTitle>
          <DialogDescription>Kolom bertanda * wajib diisi.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {table.linkResident ? (
            <div className="space-y-2">
              {editing && record?.resident && !resident ? (
                <p className="text-sm">
                  <span className="text-muted-foreground">Warga: </span>
                  <strong>{record.resident.name}</strong>
                </p>
              ) : null}
              <ResidentPicker label={editing ? "Ganti warga (opsional)" : "Warga"} value={resident} onChange={setResident} />
            </div>
          ) : null}

          {fields.map((f) => {
            const id = `rec-${f.key}`;
            const err = errors[f.key];
            const common = { id, "aria-invalid": err ? true : undefined, "aria-describedby": err ? `${id}-err` : undefined } as const;
            const v = values[f.key] ?? "";
            const set = (nv: string) => setValues((p) => ({ ...p, [f.key]: nv }));
            return (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={id}>
                  {f.label}
                  {f.required ? <span aria-hidden="true"> *</span> : null}
                  {f.piiClass !== "NONE" ? <span className="ml-2 rounded border px-1.5 py-0.5 text-xs font-normal text-muted-foreground">{PII_LABEL[f.piiClass].label}</span> : null}
                </Label>
                {f.type === "longtext" ? (
                  <Textarea {...common} rows={4} value={v} onChange={(e) => set(e.target.value)} />
                ) : f.type === "select" ? (
                  <SearchSelect {...common} className={SELECT_CLASS} value={v} onChange={(e) => set(e.target.value)}>
                    <option value="">{f.required ? "Pilih…" : "— kosong —"}</option>
                    {(Array.isArray(f.options) ? (f.options as string[]) : []).map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </SearchSelect>
                ) : f.type === "boolean" ? (
                  <SearchSelect {...common} className={SELECT_CLASS} value={v} onChange={(e) => set(e.target.value)}>
                    <option value="">{f.required ? "Pilih…" : "— kosong —"}</option>
                    <option value="ya">Ya</option>
                    <option value="tidak">Tidak</option>
                  </SearchSelect>
                ) : (
                  <Input {...common} className="h-11" type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"} inputMode={f.type === "number" ? "decimal" : undefined} step={f.type === "number" ? "any" : undefined} value={v} maxLength={f.type === "text" ? 255 : undefined} onChange={(e) => set(e.target.value)} />
                )}
                {err ? (
                  <p id={`${id}-err`} className="text-sm text-destructive">
                    {err}
                  </p>
                ) : null}
              </div>
            );
          })}

          {errorKeys.length || general.length ? (
            <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive outline-none">
              <p className="font-medium">Belum bisa disimpan:</p>
              <ul className="list-disc pl-5">
                {errorKeys.map((k) => (
                  <li key={k}>
                    {labelOf(k)}: {errors[k]}
                  </li>
                ))}
                {general.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>
              Batal
            </Button>
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
