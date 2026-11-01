"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { rupiah } from "@/components/app/perencanaan/shared";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { moneyRaw, type ListResp } from "./types";

/** Ambang nilai antar-metode milik desa (dari Perbup kabupaten). Kosong = aplikasi tidak memberi saran. */
export function SettingDialog({ data, onClose, onDone }: { data: ListResp; onClose: () => void; onDone: () => void }) {
  const [direct, setDirect] = useState(moneyRaw(data.limits.direct));
  const [offer, setOffer] = useState(moneyRaw(data.limits.offer));
  const [note, setNote] = useState(data.limits.basisNote ?? "");
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const ex = data.catalog.exampleLimits;
  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (await submit("/api/pengadaan/pengaturan", "PUT", { directLimit: direct, offerLimit: offer, basisNote: note })) onDone();
  }
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ambang nilai metode pengadaan</DialogTitle>
          <DialogDescription>Ambang ditetapkan Peraturan Bupati/Wali Kota. Isi sesuai Perbup kabupaten Anda; aplikasi hanya memberi peringatan, tidak memblokir.</DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="grid min-w-0 gap-4" noValidate>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ directLimit: "Ambang pembelian langsung", offerLimit: "Ambang permintaan penawaran", basisNote: "Dasar" }} />
          <div className="space-y-1.5">
            <Label htmlFor="st-direct">Pembelian langsung sampai dengan</Label>
            <CurrencyInput id="st-direct" inputClassName="h-11" value={direct} onValueChange={setDirect} aria-invalid={Boolean(errors.directLimit)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st-offer">Permintaan penawaran sampai dengan (di atasnya lelang)</Label>
            <CurrencyInput id="st-offer" inputClassName="h-11" value={offer} onValueChange={setOffer} aria-invalid={Boolean(errors.offerLimit)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st-note">Dasar (mis. nomor Perbup)</Label>
            <Input id="st-note" className="h-11" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="rounded-md border border-dashed p-3 text-sm">
            <p>
              Contoh jenjang dalam lampiran Peraturan LKPP 12/2019: pembelian langsung sampai {rupiah(ex.directLimit)}, permintaan penawaran sampai {rupiah(ex.offerLimit)}. Lampiran itu sendiri menyebut jenjang dapat ditetapkan berbeda oleh bupati/wali kota.
            </p>
            <Button type="button" variant="outline" className="mt-2 min-h-11" onClick={() => { setDirect(String(ex.directLimit)); setOffer(String(ex.offerLimit)); }}>
              Pakai contoh ini sebagai nilai awal
            </Button>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" className="min-h-11" disabled={busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
