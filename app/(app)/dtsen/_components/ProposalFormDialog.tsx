"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError, FormErrorSummary, fieldA11y } from "@/components/app/FormErrorSummary";
import { ResidentPicker } from "@/components/app/ResidentPicker";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { KIND_LABEL, KINDS, SOURCE_LABEL, SOURCES, type Kind, type Source } from "@/lib/dtsen/catalog";
import type { ResidentPick } from "@/lib/kependudukan/mutasi-labels";
import { SearchSelect } from "@/components/ui/search-select";

export const SELECT_CLASS =
  "flex h-11 w-full rounded-md border border-input bg-input-background px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm";

const LABELS: Record<string, string> = { residentId: "Warga", kind: "Jenis usulan", source: "Pengusul", reason: "Alasan", knownDesil: "Desil yang diketahui" };

export function ProposalFormDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [resident, setResident] = useState<ResidentPick | null>(null);
  const [f, setF] = useState<{ kind: Kind; source: Source; reason: string; knownDesil: string }>({ kind: "TAMBAH", source: "PETUGAS", reason: "", knownDesil: "" });
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (await submit("/api/dtsen/usulan", "POST", { ...f, residentId: resident?.id ?? null })) onSaved();
  }

  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Catat usulan DTSEN</DialogTitle>
          <DialogDescription>Desa tidak menetapkan desil. Usulan ini dicatat untuk diverifikasi, dibahas di musyawarah desa, lalu diteruskan ke Dinas Sosial.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <ResidentPicker value={resident} onChange={setResident} label="Warga yang diusulkan *" />
          <FieldError id="dt-resident" message={errors.residentId} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="dt-kind">Jenis usulan *</Label>
              <SearchSelect {...fieldA11y("dt-kind", errors.kind)} className={SELECT_CLASS} value={f.kind} onChange={(e) => set({ kind: e.target.value as Kind })}>
                {KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
              </SearchSelect>
              <FieldError id="dt-kind" message={errors.kind} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dt-source">Diusulkan oleh *</Label>
              <SearchSelect {...fieldA11y("dt-source", errors.source)} className={SELECT_CLASS} value={f.source} onChange={(e) => set({ source: e.target.value as Source })}>
                {SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
              </SearchSelect>
              <FieldError id="dt-source" message={errors.source} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dt-reason">Alasan usulan *</Label>
            <Textarea {...fieldA11y("dt-reason", errors.reason)} rows={3} value={f.reason} maxLength={1000} onChange={(e) => set({ reason: e.target.value })} placeholder="Kondisi rumah tangga atau alasan perubahan, singkat dan faktual" />
            <FieldError id="dt-reason" message={errors.reason} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dt-desil">Desil yang diketahui</Label>
            <Input {...fieldA11y("dt-desil", errors.knownDesil)} className="h-11" value={f.knownDesil} maxLength={20} onChange={(e) => set({ knownDesil: e.target.value })} placeholder="Contoh: 7 (dari Cek Bansos)" />
            <p className="text-sm text-muted-foreground">Hanya catatan; desil resmi ditetapkan pemerintah pusat.</p>
            <FieldError id="dt-desil" message={errors.knownDesil} />
          </div>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={LABELS} />
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>Batal</Button>
            <Button type="submit" className="min-h-11" disabled={busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              {busy ? "Menyimpan…" : "Simpan usulan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
