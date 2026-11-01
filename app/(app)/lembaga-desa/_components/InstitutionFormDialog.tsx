"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError, FormErrorSummary, fieldA11y } from "@/components/app/FormErrorSummary";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { INSTITUTION_TYPE_LABEL, INSTITUTION_TYPES } from "@/lib/tata-kelola/catalog";
import type { InstitutionView } from "@/lib/tata-kelola/institutions";
import { SearchSelect } from "@/components/ui/search-select";

export const SELECT_CLASS =
  "flex h-11 w-full rounded-md border border-input bg-input-background px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm";

const LABELS: Record<string, string> = { type: "Jenis", name: "Nama", decreeNumber: "Nomor SK", decreeDate: "Tanggal SK", periodStart: "Awal masa jabatan", periodEnd: "Akhir masa jabatan", description: "Keterangan" };

export function InstitutionFormDialog({ item, onClose, onSaved }: { item: InstitutionView | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    type: item?.type ?? "BPD",
    name: item?.name ?? "",
    decreeNumber: item?.decreeNumber ?? "",
    decreeDate: item?.decreeDate ?? "",
    periodStart: item?.periodStart ?? "",
    periodEnd: item?.periodEnd ?? "",
    description: item?.description ?? "",
  });
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await submit(item ? `/api/tata-kelola/lembaga/${item.id}` : "/api/tata-kelola/lembaga", item ? "PATCH" : "POST", f);
    if (ok) onSaved();
  }

  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{item ? "Ubah lembaga" : "Tambah lembaga"}</DialogTitle>
          <DialogDescription>Catat lembaga desa beserta SK pengukuhan dan masa jabatannya. Anggota ditambahkan setelah lembaga disimpan.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="lm-type">Jenis *</Label>
              <SearchSelect {...fieldA11y("lm-type", errors.type)} className={SELECT_CLASS} value={f.type} onChange={(e) => set({ type: e.target.value as typeof f.type })}>
                {INSTITUTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {INSTITUTION_TYPE_LABEL[t]}
                  </option>
                ))}
              </SearchSelect>
              <FieldError id="lm-type" message={errors.type} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lm-name">Nama *</Label>
              <Input {...fieldA11y("lm-name", errors.name)} className="h-11" value={f.name} maxLength={200} onChange={(e) => set({ name: e.target.value })} placeholder="Contoh: BPD Desa Makmur" />
              <FieldError id="lm-name" message={errors.name} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="lm-decreeNumber">Nomor SK pengukuhan</Label>
              <Input {...fieldA11y("lm-decreeNumber", errors.decreeNumber)} className="h-11" value={f.decreeNumber} maxLength={100} onChange={(e) => set({ decreeNumber: e.target.value })} />
              <FieldError id="lm-decreeNumber" message={errors.decreeNumber} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lm-decreeDate">Tanggal SK</Label>
              <Input {...fieldA11y("lm-decreeDate", errors.decreeDate)} className="h-11" type="date" value={f.decreeDate} onChange={(e) => set({ decreeDate: e.target.value })} />
              <FieldError id="lm-decreeDate" message={errors.decreeDate} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lm-periodStart">Awal masa jabatan</Label>
              <Input {...fieldA11y("lm-periodStart", errors.periodStart)} className="h-11" type="date" value={f.periodStart} onChange={(e) => set({ periodStart: e.target.value })} />
              <FieldError id="lm-periodStart" message={errors.periodStart} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lm-periodEnd">Akhir masa jabatan</Label>
              <Input {...fieldA11y("lm-periodEnd", errors.periodEnd)} className="h-11" type="date" value={f.periodEnd} onChange={(e) => set({ periodEnd: e.target.value })} />
              <FieldError id="lm-periodEnd" message={errors.periodEnd} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lm-description">Keterangan</Label>
            <Textarea {...fieldA11y("lm-description", errors.description)} rows={2} value={f.description} maxLength={500} onChange={(e) => set({ description: e.target.value })} />
            <FieldError id="lm-description" message={errors.description} />
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
