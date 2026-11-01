"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { fmtDate, rupiah } from "@/components/app/perencanaan/shared";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { localToday } from "@/lib/form-input";
import { ConfirmDelete } from "./ConfirmDelete";
import type { TabProps } from "./types";

export function DisbursementsTab({ data, reload }: TabProps) {
  const [adding, setAdding] = useState(false);
  return (
    <section aria-labelledby="kd-pen-h" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="kd-pen-h" className="text-lg font-semibold">
            Penyaluran dana KDMP
          </h2>
          <p className="text-sm text-muted-foreground">Dana KDMP disalurkan terpisah dari Dana Desa reguler (PMK 7/2026 Pasal 22). Catat setiap penerimaan beserta nomor keputusannya.</p>
        </div>
        {data.can.create ? (
          <Button type="button" className="min-h-11" onClick={() => setAdding(true)}>
            <Plus aria-hidden="true" />
            Catat penyaluran
          </Button>
        ) : null}
      </div>
      {data.disbursements.length ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[34rem] text-sm">
            <caption className="sr-only">Penyaluran dana KDMP tahun {data.year}</caption>
            <thead className="bg-muted text-left">
              <tr>
                <th scope="col" className="px-3 py-2">Tanggal diterima</th>
                <th scope="col" className="px-3 py-2 text-right">Jumlah</th>
                <th scope="col" className="px-3 py-2">Nomor keputusan / bukti</th>
                <th scope="col" className="px-3 py-2">
                  <span className="sr-only">Aksi</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.disbursements.map((d) => (
                <tr key={d.id}>
                  <td className="whitespace-nowrap px-3 py-2">{fmtDate(d.receivedOn)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{rupiah(d.amount)}</td>
                  <td className="px-3 py-2">
                    {d.reference ?? "-"}
                    {d.note ? <span className="block text-xs text-muted-foreground">{d.note}</span> : null}
                  </td>
                  <td className="px-3 py-1 text-right">
                    {data.can.delete && data.can.approve ? <ConfirmDelete label={`Hapus penyaluran ${fmtDate(d.receivedOn)}`} title="Hapus catatan penyaluran?" description={`Catatan penyaluran ${rupiah(d.amount)} tanggal ${fmtDate(d.receivedOn)} akan dihapus. Gunakan hanya untuk koreksi salah input; tindakan ini tercatat dalam jejak audit.`} url={`/api/kdmp/penyaluran/${d.id}`} onDone={reload} /> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Belum ada penyaluran dana KDMP tercatat untuk tahun {data.year}.</p>
      )}
      {adding ? <AddDialog year={data.year} onClose={() => setAdding(false)} onDone={() => { setAdding(false); reload(); }} /> : null}
    </section>
  );
}

function AddDialog({ year, onClose, onDone }: { year: number; onClose: () => void; onDone: () => void }) {
  const [date, setDate] = useState(() => localToday());
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (await submit("/api/kdmp/penyaluran", "POST", { year, receivedOn: date, amount, reference, note })) onDone();
  }
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Catat penyaluran dana KDMP ({year})</DialogTitle>
          <DialogDescription>Isi sesuai dana yang benar-benar masuk ke rekening penampung KDMP desa.</DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="space-y-4" noValidate>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ receivedOn: "Tanggal diterima", amount: "Jumlah", reference: "Nomor keputusan", note: "Catatan", year: "Tahun" }} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="kd-pen-date">Tanggal diterima *</Label>
              <Input id="kd-pen-date" type="date" className="h-11" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={Boolean(errors.receivedOn)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kd-pen-amt">Jumlah *</Label>
              <CurrencyInput id="kd-pen-amt" inputClassName="h-11" value={amount} onValueChange={setAmount} aria-invalid={Boolean(errors.amount)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kd-pen-ref">Nomor keputusan / bukti</Label>
            <Input id="kd-pen-ref" className="h-11" maxLength={150} value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kd-pen-note">Catatan</Label>
            <Input id="kd-pen-note" className="h-11" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
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
