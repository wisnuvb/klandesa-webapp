"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FIELD_TYPE_LABEL, FIELD_TYPES, PII_CLASSES, PII_LABEL, type FieldType, type PiiClass } from "@/lib/custom-data/schema";
import { newFieldForm, type FieldForm } from "@/lib/custom-data/ui-model";
import { SearchSelect } from "@/components/ui/search-select";

export const SELECT_CLASS =
  "flex h-11 w-full rounded-md border border-input bg-input-background px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm";

/** Pembuat daftar kolom baru (dipakai saat membuat tabel dan saat menambah kolom). */
export function FieldBuilder({ fields, onChange, maxFields, idPrefix }: { fields: FieldForm[]; onChange: (f: FieldForm[]) => void; maxFields: number; idPrefix: string }) {
  const set = (uid: string, patch: Partial<FieldForm>) => onChange(fields.map((f) => (f.uid === uid ? { ...f, ...patch } : f)));

  return (
    <div className="space-y-3">
      {fields.map((f, i) => {
        const id = `${idPrefix}-${f.uid}`;
        return (
          <fieldset key={f.uid} className="space-y-3 rounded-md border p-4">
            <legend className="px-1 text-sm font-medium">Kolom {i + 1}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-label`}>Nama kolom</Label>
                <Input id={`${id}-label`} className="h-11" value={f.label} maxLength={100} onChange={(e) => set(f.uid, { label: e.target.value })} placeholder="Contoh: Jenis bantuan" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-type`}>Jenis isian</Label>
                <SearchSelect id={`${id}-type`} className={SELECT_CLASS} value={f.type} onChange={(e) => set(f.uid, { type: e.target.value as FieldType })}>
                  {FIELD_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {FIELD_TYPE_LABEL[t]}
                    </option>
                  ))}
                </SearchSelect>
              </div>
            </div>

            {f.type === "select" ? (
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-opts`}>Pilihan (satu per baris, minimal 2)</Label>
                <Textarea id={`${id}-opts`} rows={3} value={f.optionsText} onChange={(e) => set(f.uid, { optionsText: e.target.value })} placeholder={"Beras\nUang tunai"} />
              </div>
            ) : null}
            {f.type === "number" ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`${id}-min`}>Nilai terkecil (opsional)</Label>
                  <Input id={`${id}-min`} type="number" inputMode="decimal" className="h-11" value={f.min} onChange={(e) => set(f.uid, { min: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${id}-max`}>Nilai terbesar (opsional)</Label>
                  <Input id={`${id}-max`} type="number" inputMode="decimal" className="h-11" value={f.max} onChange={(e) => set(f.uid, { max: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${id}-unit`}>Satuan (opsional)</Label>
                  <Input id={`${id}-unit`} className="h-11" value={f.unit} maxLength={20} onChange={(e) => set(f.uid, { unit: e.target.value })} placeholder="kg, orang, Rp" />
                </div>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor={`${id}-pii`}>Jenis data</Label>
              <SearchSelect id={`${id}-pii`} className={SELECT_CLASS} value={f.piiClass} onChange={(e) => set(f.uid, { piiClass: e.target.value as PiiClass })}>
                {PII_CLASSES.map((c) => (
                  <option key={c} value={c}>
                    {PII_LABEL[c].label}
                  </option>
                ))}
              </SearchSelect>
              <p className="text-sm text-muted-foreground">{PII_LABEL[f.piiClass].hint}</p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" className="size-5" checked={f.required} onChange={(e) => set(f.uid, { required: e.target.checked })} />
                Wajib diisi
              </label>
              {fields.length > 1 ? (
                <Button type="button" variant="ghost" className="min-h-11" aria-label={`Hapus kolom ${i + 1}${f.label ? `: ${f.label}` : ""}`} onClick={() => onChange(fields.filter((x) => x.uid !== f.uid))}>
                  <Trash2 aria-hidden="true" />
                  Hapus kolom ini
                </Button>
              ) : null}
            </div>
          </fieldset>
        );
      })}
      <Button type="button" variant="outline" className="min-h-11" disabled={fields.length >= maxFields} onClick={() => onChange([...fields, newFieldForm()])}>
        <Plus aria-hidden="true" />
        Tambah kolom
      </Button>
      {fields.length >= maxFields ? <p className="text-sm text-muted-foreground">Sudah mencapai batas {maxFields} kolom.</p> : null}
    </div>
  );
}
