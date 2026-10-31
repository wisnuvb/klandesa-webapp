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
import { NATURE_LABEL, NATURES, type Direction } from "@/lib/tata-kelola/catalog";
import type { RegisterView } from "@/lib/tata-kelola/register";

const SELECT_CLASS =
  "flex h-11 w-full rounded-md border border-input bg-input-background px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm";

const today = () => new Date().toISOString().slice(0, 10);

export function MailFormDialog({ direction, item, onClose, onSaved }: { direction: Direction; item: RegisterView | null; onClose: () => void; onSaved: () => void }) {
  const out = (item?.direction ?? direction) === "OUT";
  const [f, setF] = useState({
    letterNumber: item?.letterNumber ?? "",
    letterDate: item?.letterDate ?? "",
    registeredAt: item?.registeredAt ?? today(),
    party: item?.party ?? "",
    subject: item?.subject ?? "",
    nature: item?.nature ?? "BIASA",
    disposition: item?.disposition ?? "",
    notes: item?.notes ?? "",
  });
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const regLabel = out ? "Tanggal dikirim" : "Tanggal diterima";
  const labels: Record<string, string> = { letterNumber: "Nomor surat", letterDate: "Tanggal surat", registeredAt: regLabel, party: out ? "Tujuan" : "Asal", subject: "Perihal", nature: "Sifat", disposition: "Disposisi", notes: "Keterangan" };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await submit(item ? `/api/tata-kelola/surat/${item.id}` : "/api/tata-kelola/surat", item ? "PATCH" : "POST", { ...f, direction: item?.direction ?? direction });
    if (ok) onSaved();
  }

  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {item ? `Ubah ${out ? "surat keluar" : "surat masuk"} ${item.agendaLabel}` : out ? "Catat surat keluar" : "Catat surat masuk"}
          </DialogTitle>
          <DialogDescription>{item ? "Nomor agenda tidak berubah." : "Nomor agenda diberikan otomatis berurutan setiap tahun."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sr-letterNumber">Nomor surat</Label>
              <Input {...fieldA11y("sr-letterNumber", errors.letterNumber)} className="h-11" value={f.letterNumber} maxLength={100} onChange={(e) => set({ letterNumber: e.target.value })} />
              <FieldError id="sr-letterNumber" message={errors.letterNumber} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sr-nature">Sifat</Label>
              <select {...fieldA11y("sr-nature", errors.nature)} className={SELECT_CLASS} value={f.nature} onChange={(e) => set({ nature: e.target.value })}>
                {NATURES.map((n) => (
                  <option key={n} value={n}>
                    {NATURE_LABEL[n]}
                  </option>
                ))}
              </select>
              <FieldError id="sr-nature" message={errors.nature} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sr-letterDate">Tanggal surat *</Label>
              <Input {...fieldA11y("sr-letterDate", errors.letterDate)} className="h-11" type="date" value={f.letterDate} onChange={(e) => set({ letterDate: e.target.value })} />
              <FieldError id="sr-letterDate" message={errors.letterDate} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sr-registeredAt">{regLabel} *</Label>
              <Input {...fieldA11y("sr-registeredAt", errors.registeredAt)} className="h-11" type="date" value={f.registeredAt} onChange={(e) => set({ registeredAt: e.target.value })} />
              <FieldError id="sr-registeredAt" message={errors.registeredAt} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sr-party">{out ? "Tujuan surat" : "Asal surat"} *</Label>
            <Input {...fieldA11y("sr-party", errors.party)} className="h-11" value={f.party} maxLength={200} onChange={(e) => set({ party: e.target.value })} placeholder={out ? "Contoh: Camat Kecamatan X" : "Contoh: Dinas PMD Kabupaten"} />
            <FieldError id="sr-party" message={errors.party} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sr-subject">Perihal *</Label>
            <Input {...fieldA11y("sr-subject", errors.subject)} className="h-11" value={f.subject} maxLength={300} onChange={(e) => set({ subject: e.target.value })} />
            <FieldError id="sr-subject" message={errors.subject} />
          </div>
          {!out ? (
            <div className="space-y-1.5">
              <Label htmlFor="sr-disposition">Disposisi</Label>
              <Textarea {...fieldA11y("sr-disposition", errors.disposition)} rows={2} value={f.disposition} maxLength={1000} onChange={(e) => set({ disposition: e.target.value })} placeholder="Arahan Kepala Desa untuk surat ini" />
              <FieldError id="sr-disposition" message={errors.disposition} />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="sr-notes">Keterangan</Label>
            <Input {...fieldA11y("sr-notes", errors.notes)} className="h-11" value={f.notes} maxLength={500} onChange={(e) => set({ notes: e.target.value })} />
            <FieldError id="sr-notes" message={errors.notes} />
          </div>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={labels} />
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
