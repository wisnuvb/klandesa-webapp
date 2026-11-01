"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { SELECT_CLASS, fmtDate, rupiah } from "@/components/app/perencanaan/shared";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { localToday } from "@/lib/form-input";
import { ConfirmDelete } from "@/components/app/ConfirmDelete";
import { FundingPanel } from "@/components/app/apbdes/FundingPanel";
import type { TabProps } from "./types";

export function InstallmentsTab({ data, reload }: TabProps) {
  const [adding, setAdding] = useState(false);
  return (
    <section aria-labelledby="kd-ang-h" className="space-y-3">
      <FundingPanel kind="KDMP" funding={data.funding} canRequest={data.can.create} year={data.year} title={`Ajukan SPP angsuran KDMP ${data.year}`} summary={`Dana KDMP diterima ${rupiah(data.totals.received)}, sudah diangsurkan ${rupiah(data.totals.paid)}.`} url="/api/kdmp/spp" extraBody={{ year: data.year }} noun="Angsuran KDMP" reload={reload} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="kd-ang-h" className="text-lg font-semibold">
            Angsuran dari dana KDMP
          </h2>
          <p className="text-sm text-muted-foreground">Dana KDMP dipakai untuk angsuran pembangunan fisik gerai, pergudangan, dan kelengkapan (PMK 7/2026 Pasal 20). Angsuran dicatat setelah dibayar, dari SPP yang sudah dibayar, dan tidak dapat melebihi dana yang diterima.</p>
        </div>
        {data.can.create ? (
          <Button type="button" className="min-h-11" onClick={() => setAdding(true)}>
            <Plus aria-hidden="true" />
            Catat angsuran
          </Button>
        ) : null}
      </div>
      {data.installments.length ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[40rem] text-sm">
            <caption className="sr-only">Angsuran dana KDMP tahun {data.year}</caption>
            <thead className="bg-muted text-left">
              <tr>
                <th scope="col" className="px-3 py-2">Tanggal bayar</th>
                <th scope="col" className="px-3 py-2">Dibayarkan kepada</th>
                <th scope="col" className="px-3 py-2">Untuk</th>
                <th scope="col" className="px-3 py-2 text-right">Jumlah</th>
                <th scope="col" className="px-3 py-2">
                  <span className="sr-only">Aksi</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.installments.map((i) => (
                <tr key={i.id}>
                  <td className="whitespace-nowrap px-3 py-2">{fmtDate(i.paidOn)}</td>
                  <td className="px-3 py-2">
                    {i.payee}
                    {i.reference ? <span className="block text-xs text-muted-foreground">{i.reference}</span> : null}
                  </td>
                  <td className="px-3 py-2">{i.facilityName ?? <span className="text-muted-foreground">Belum dikaitkan</span>}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{rupiah(i.amount)}</td>
                  <td className="px-3 py-1 text-right">
                    {data.can.delete && data.can.approve ? <ConfirmDelete label={`Hapus angsuran ${fmtDate(i.paidOn)} ${i.payee}`} title="Hapus catatan angsuran?" description={`Angsuran ${rupiah(i.amount)} kepada ${i.payee} tanggal ${fmtDate(i.paidOn)} akan dihapus. Gunakan hanya untuk koreksi salah input; tindakan ini tercatat dalam jejak audit.`} url={`/api/kdmp/angsuran/${i.id}`} onDone={reload} /> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Belum ada angsuran tercatat untuk tahun {data.year}.</p>
      )}
      {adding ? <AddDialog data={data} onClose={() => setAdding(false)} onDone={() => { setAdding(false); reload(); }} /> : null}
    </section>
  );
}

function AddDialog({ data, onClose, onDone }: { data: TabProps["data"]; onClose: () => void; onDone: () => void }) {
  const [date, setDate] = useState(() => localToday());
  const [amount, setAmount] = useState("");
  const [payee, setPayee] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (await submit("/api/kdmp/angsuran", "POST", { year: data.year, paidOn: date, amount, payee, facilityId: facilityId || null, reference, note })) onDone();
  }
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Catat angsuran KDMP ({data.year})</DialogTitle>
          <DialogDescription>
            Saldo dana yang belum diangsurkan: <strong className="tabular-nums">{rupiah(data.totals.balance)}</strong>. Dana SPP yang siap dipakai: <strong className="tabular-nums">{rupiah(data.funding.available)}</strong>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="space-y-4" noValidate>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ paidOn: "Tanggal bayar", amount: "Jumlah", payee: "Dibayarkan kepada", facilityId: "Gerai/gudang", reference: "Nomor perjanjian", note: "Catatan", year: "Tahun" }} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="kd-ang-date">Tanggal bayar *</Label>
              <Input id="kd-ang-date" type="date" className="h-11" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={Boolean(errors.paidOn)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kd-ang-amt">Jumlah *</Label>
              <CurrencyInput id="kd-ang-amt" inputClassName="h-11" value={amount} onValueChange={setAmount} aria-invalid={Boolean(errors.amount)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kd-ang-payee">Dibayarkan kepada *</Label>
            <Input id="kd-ang-payee" className="h-11" maxLength={150} value={payee} onChange={(e) => setPayee(e.target.value)} aria-invalid={Boolean(errors.payee)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kd-ang-fac">Untuk gerai/gudang</Label>
            <SearchSelect id="kd-ang-fac" className={SELECT_CLASS} value={facilityId} onChange={(e) => setFacilityId(e.target.value)}>
              <option value="">Belum dikaitkan</option>
              {data.facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.kindLabel}: {f.name}
                </option>
              ))}
            </SearchSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kd-ang-ref">Nomor perjanjian / kuitansi</Label>
            <Input id="kd-ang-ref" className="h-11" maxLength={150} value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kd-ang-note">Catatan</Label>
            <Input id="kd-ang-note" className="h-11" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
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
