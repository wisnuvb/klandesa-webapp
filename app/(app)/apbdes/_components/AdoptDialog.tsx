"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormErrorSummary, fieldA11y } from "@/components/app/FormErrorSummary";
import { useFormSubmit } from "@/hooks/useFormSubmit";

/** Penetapan dokumen (setelah Perdes disahkan) atau pembuatan perubahan; dua bentuk dengan isian berbeda. */
export function AdoptDialog({ documentId, label, onClose, onDone }: { documentId: number; label: string; onClose: () => void; onDone: (warnings: string[]) => void }) {
  const [num, setNum] = useState("");
  const [date, setDate] = useState("");
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tetapkan {label}</DialogTitle>
          <DialogDescription>Isi nomor dan tanggal Peraturan Desa yang sudah disahkan. Setelah ditetapkan, baris anggaran terkunci; perubahan dilakukan lewat Perubahan APB Desa.</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await submit<{ warnings?: string[] }>(`/api/apbdes/dokumen/${documentId}/tetapkan`, "POST", { regulationNumber: num, regulationDate: date });
            if (r) onDone(r.warnings ?? []);
          }}
        >
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ regulationNumber: "Nomor Peraturan Desa", regulationDate: "Tanggal penetapan" }} />
          <div className="space-y-1.5">
            <Label htmlFor="ad-num">Nomor Peraturan Desa *</Label>
            <Input {...fieldA11y("ad-num", errors.regulationNumber)} className="h-11" maxLength={100} value={num} onChange={(e) => setNum(e.target.value)} placeholder="Contoh: 3 Tahun 2026" />
            <FieldError id="ad-num" message={errors.regulationNumber} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ad-date">Tanggal penetapan *</Label>
            <Input {...fieldA11y("ad-date", errors.regulationDate)} className="h-11" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <FieldError id="ad-date" message={errors.regulationDate} />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>Batal</Button>
            <Button type="submit" className="min-h-11" disabled={busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              Tetapkan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AmendmentDialog({ year, nextVersion, onClose, onDone }: { year: number; nextVersion: number; onClose: () => void; onDone: (id: number) => void }) {
  const [reason, setReason] = useState("");
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const exceptional = nextVersion >= 2;
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Buat Perubahan APB Desa ke-{nextVersion}</DialogTitle>
          <DialogDescription>
            Perubahan dimulai dari salinan APB Desa terakhir yang ditetapkan. {exceptional ? "Perubahan hanya boleh sekali setahun kecuali keadaan luar biasa (Pasal 40 ayat 2); kriterianya diatur Peraturan Bupati/Wali Kota." : "Perubahan APB Desa hanya dapat dilakukan sekali dalam setahun anggaran (Pasal 40 ayat 2)."}
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await submit<{ id: number }>("/api/apbdes/perubahan", "POST", { year, exceptionalReason: reason });
            if (r) onDone(r.id);
          }}
        >
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ exceptionalReason: "Keadaan luar biasa" }} />
          {exceptional ? (
            <div className="space-y-1.5">
              <Label htmlFor="am-reason">Keadaan luar biasa *</Label>
              <Input {...fieldA11y("am-reason", errors.exceptionalReason)} className="h-11" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
              <FieldError id="am-reason" message={errors.exceptionalReason} />
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>Batal</Button>
            <Button type="submit" className="min-h-11" disabled={busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              Buat draf perubahan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
