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
import { LEGAL_TYPE_LABEL, LEGAL_TYPES } from "@/lib/tata-kelola/catalog";
import type { LegalView } from "@/lib/tata-kelola/legal";

export const SELECT_CLASS =
  "flex h-11 w-full rounded-md border border-input bg-input-background px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm";

const LABELS: Record<string, string> = { type: "Jenis", number: "Nomor", title: "Tentang", summary: "Ringkasan", enactedAt: "Tanggal ditetapkan", promulgatedAt: "Tanggal diundangkan", submittedAt: "Tanggal disampaikan" };

export function LegalFormDialog({ item, onClose, onSaved }: { item: LegalView | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    type: item?.type ?? "PERDES",
    number: item?.number ?? "",
    title: item?.title ?? "",
    summary: item?.summary ?? "",
    enactedAt: item?.enactedAt ?? "",
    promulgatedAt: item?.promulgatedAt ?? "",
    submittedAt: item?.submittedAt ?? "",
  });
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = { ...f, promulgatedAt: f.promulgatedAt || null, submittedAt: f.submittedAt || null };
    const ok = await submit(item ? `/api/tata-kelola/produk-hukum/${item.id}` : "/api/tata-kelola/produk-hukum", item ? "PATCH" : "POST", body);
    if (ok) onSaved();
  }

  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{item ? "Ubah produk hukum" : "Catat produk hukum"}</DialogTitle>
          <DialogDescription>Catat identitas produk hukum desa. Berkas salinannya tetap disimpan di Arsip Digital.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ph-type">Jenis *</Label>
              <select {...fieldA11y("ph-type", errors.type)} className={SELECT_CLASS} value={f.type} onChange={(e) => set({ type: e.target.value as typeof f.type })}>
                {LEGAL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {LEGAL_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
              <FieldError id="ph-type" message={errors.type} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ph-number">Nomor *</Label>
              <Input {...fieldA11y("ph-number", errors.number)} className="h-11" value={f.number} maxLength={60} onChange={(e) => set({ number: e.target.value })} placeholder="Contoh: 3 Tahun 2026" />
              <FieldError id="ph-number" message={errors.number} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ph-title">Tentang *</Label>
            <Input {...fieldA11y("ph-title", errors.title)} className="h-11" value={f.title} maxLength={300} onChange={(e) => set({ title: e.target.value })} placeholder="Contoh: Anggaran Pendapatan dan Belanja Desa Tahun 2026" />
            <FieldError id="ph-title" message={errors.title} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ph-summary">Ringkasan isi</Label>
            <Textarea {...fieldA11y("ph-summary", errors.summary)} rows={3} value={f.summary} maxLength={1000} onChange={(e) => set({ summary: e.target.value })} />
            <FieldError id="ph-summary" message={errors.summary} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="ph-enactedAt">Ditetapkan *</Label>
              <Input {...fieldA11y("ph-enactedAt", errors.enactedAt)} className="h-11" type="date" value={f.enactedAt} onChange={(e) => set({ enactedAt: e.target.value })} />
              <FieldError id="ph-enactedAt" message={errors.enactedAt} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ph-promulgatedAt">Diundangkan</Label>
              <Input {...fieldA11y("ph-promulgatedAt", errors.promulgatedAt)} className="h-11" type="date" value={f.promulgatedAt} onChange={(e) => set({ promulgatedAt: e.target.value })} />
              <FieldError id="ph-promulgatedAt" message={errors.promulgatedAt} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ph-submittedAt">Disampaikan ke Bupati</Label>
              <Input {...fieldA11y("ph-submittedAt", errors.submittedAt)} className="h-11" type="date" value={f.submittedAt} onChange={(e) => set({ submittedAt: e.target.value })} />
              <FieldError id="ph-submittedAt" message={errors.submittedAt} />
            </div>
          </div>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={LABELS} />
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
