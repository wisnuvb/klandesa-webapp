"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormErrorSummary, fieldA11y } from "@/components/app/FormErrorSummary";
import { useApiGet } from "@/hooks/useApiGet";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import type { LoanDetail } from "@/lib/coop/savings-loans";
import { day, rupiah, SELECT_CLASS, type LoanRow, type SavingsResponse } from "./shared";

interface LoansResponse {
  loans: LoanRow[];
  canManage: boolean;
  limits: { maxRatePercent: number; maxTermMonths: number };
}

const STATE_LABEL: Record<string, string> = { LUNAS: "Lunas", SEBAGIAN: "Sebagian", BELUM: "Belum", TERLAMBAT: "Terlambat" };

export function PinjamanTab() {
  const [status, setStatus] = useState<"" | "AKTIF" | "LUNAS">("AKTIF");
  const { data, loading, error, reload } = useApiGet<LoansResponse>(`/api/coop/loans${status ? `?status=${status}` : ""}`);
  const members = useApiGet<SavingsResponse>("/api/coop/savings");
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<number | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Status pinjaman" className="flex gap-2">
          {([["AKTIF", "Aktif"], ["LUNAS", "Lunas"], ["", "Semua"]] as const).map(([v, l]) => (
            <Button key={l} type="button" aria-pressed={status === v} variant={status === v ? "default" : "outline"} className="min-h-11" onClick={() => setStatus(v)}>{l}</Button>
          ))}
        </div>
        {data?.canManage ? (
          <Button type="button" className="min-h-11" onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" />
            Cairkan pinjaman
          </Button>
        ) : null}
      </div>

      {loading ? <p role="status" className="flex items-center gap-2 p-4 text-muted-foreground"><Loader2 aria-hidden="true" className="size-5 animate-spin" />Memuat pinjaman…</p> : null}
      {error ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          <p>{error}</p>
          <Button type="button" variant="outline" className="min-h-11" onClick={reload}>Coba lagi</Button>
        </div>
      ) : null}
      {data && data.loans.length === 0 ? <p className="rounded-lg border border-dashed p-6 text-center">Tidak ada pinjaman.</p> : null}
      {data && data.loans.length > 0 ? (
        <ul className="space-y-2">
          {data.loans.map((l) => (
            <li key={l.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words font-medium">{l.memberName}</p>
                  <p className="text-sm text-muted-foreground">
                    {rupiah(l.principal)} · {l.ratePercent}%/bulan · {l.termMonths} bulan · cair {day(l.disbursedAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums">{l.status === "LUNAS" ? "Lunas" : `Sisa ${rupiah(l.outstanding)}`}</p>
                  {l.status === "AKTIF" && l.overdueCount > 0 ? (
                    <p className="flex items-center justify-end gap-1 text-sm font-medium text-destructive">
                      <AlertTriangle aria-hidden="true" className="size-4" />
                      {l.overdueCount} angsuran terlambat
                    </p>
                  ) : l.nextDue ? <p className="text-sm text-muted-foreground">Jatuh tempo berikutnya {day(l.nextDue)}</p> : null}
                </div>
              </div>
              <Button type="button" variant="outline" className="mt-2 min-h-11" onClick={() => setDetail(l.id)} aria-label={`Rincian pinjaman ${l.memberName}`}>Rincian & pembayaran</Button>
            </li>
          ))}
        </ul>
      ) : null}

      {creating && members.data && data ? <LoanDialog members={members.data.members.filter((m) => m.active)} limits={data.limits} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); reload(); }} /> : null}
      {detail !== null ? <DetailDialog id={detail} onClose={() => setDetail(null)} onChanged={reload} /> : null}
    </div>
  );
}

const LOAN_LABELS: Record<string, string> = { memberId: "Anggota", principal: "Jumlah pinjaman", ratePercent: "Bunga", termMonths: "Lama", disbursedAt: "Tanggal cair", purpose: "Tujuan" };

function LoanDialog({ members, limits, onClose, onSaved }: { members: SavingsResponse["members"]; limits: LoansResponse["limits"]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ memberId: "", principal: "", ratePercent: "0", termMonths: "6", disbursedAt: new Date().toISOString().slice(0, 10), purpose: "" });
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cairkan pinjaman</DialogTitle>
          <DialogDescription>Bunga flat per bulan dari pokok awal; 0 untuk tanpa bunga. Jadwal angsuran dihitung otomatis dan tidak dapat diubah setelah pinjaman dicairkan.</DialogDescription>
        </DialogHeader>
        <form onSubmit={async (e) => { e.preventDefault(); if (await submit("/api/coop/loans", "POST", { ...f, memberId: Number(f.memberId) || undefined, termMonths: Number(f.termMonths) })) onSaved(); }} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="ln-member">Anggota peminjam *</Label>
            <select {...fieldA11y("ln-member", errors.memberId)} className={SELECT_CLASS} value={f.memberId} onChange={(e) => set({ memberId: e.target.value })}>
              <option value="">Pilih anggota…</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <FieldError id="ln-member" message={errors.memberId} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ln-principal">Jumlah pinjaman *</Label>
            <CurrencyInput {...fieldA11y("ln-principal", errors.principal)} inputClassName="h-11" value={f.principal} onValueChange={(d) => set({ principal: d })} />
            <FieldError id="ln-principal" message={errors.principal} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ln-rate">Bunga per bulan (%)</Label>
              <Input {...fieldA11y("ln-rate", errors.ratePercent)} className="h-11" inputMode="decimal" value={f.ratePercent} onChange={(e) => set({ ratePercent: e.target.value.replace(",", ".") })} />
              <p className="text-sm text-muted-foreground">Maksimal {limits.maxRatePercent}%.</p>
              <FieldError id="ln-rate" message={errors.ratePercent} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ln-term">Lama (bulan) *</Label>
              <Input {...fieldA11y("ln-term", errors.termMonths)} className="h-11" type="number" inputMode="numeric" min={1} max={limits.maxTermMonths} value={f.termMonths} onChange={(e) => set({ termMonths: e.target.value })} />
              <FieldError id="ln-term" message={errors.termMonths} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ln-date">Tanggal cair *</Label>
            <Input {...fieldA11y("ln-date", errors.disbursedAt)} className="h-11" type="date" value={f.disbursedAt} onChange={(e) => set({ disbursedAt: e.target.value })} />
            <FieldError id="ln-date" message={errors.disbursedAt} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ln-purpose">Tujuan</Label>
            <Input {...fieldA11y("ln-purpose", errors.purpose)} className="h-11" value={f.purpose} maxLength={200} onChange={(e) => set({ purpose: e.target.value })} />
            <FieldError id="ln-purpose" message={errors.purpose} />
          </div>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={LOAN_LABELS} />
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>Batal</Button>
            <Button type="submit" className="min-h-11" disabled={busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              {busy ? "Memproses…" : "Cairkan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DetailDialog({ id, onClose, onChanged }: { id: number; onClose: () => void; onChanged: () => void }) {
  const { data, loading, error, reload } = useApiGet<{ loan: LoanDetail; canManage: boolean }>(`/api/coop/loans/${id}`);
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const l = data?.loan;
  return (
    <Dialog open onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{l ? `Pinjaman ${l.memberName}` : "Rincian pinjaman"}</DialogTitle>
          <DialogDescription>{l ? `${rupiah(l.principal)} · ${l.ratePercent}%/bulan · ${l.termMonths} bulan · total kewajiban ${rupiah(l.totalDue)}` : ""}</DialogDescription>
        </DialogHeader>
        {loading ? <p role="status" className="flex items-center gap-2 text-muted-foreground"><Loader2 aria-hidden="true" className="size-4 animate-spin" />Memuat…</p> : null}
        {error ? <p role="alert" className="text-destructive">{error}</p> : null}
        {l ? (
          <div className="space-y-4">
            <p className="font-semibold tabular-nums">{l.status === "LUNAS" ? "Lunas" : `Sisa kewajiban ${rupiah(l.outstanding)} (sisa pokok ${rupiah(l.principalOutstanding)})`}</p>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Jadwal angsuran</caption>
                <thead className="bg-muted/50">
                  <tr>{["Ke", "Jatuh tempo", "Pokok", "Bunga", "Angsuran", "Terbayar", "Status"].map((h) => <th key={h} scope="col" className="p-2 font-medium">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y tabular-nums">
                  {l.schedule.map((s) => (
                    <tr key={s.no}>
                      <td className="p-2">{s.no}</td>
                      <td className="p-2">{day(s.dueDate)}</td>
                      <td className="p-2">{rupiah(s.principal)}</td>
                      <td className="p-2">{rupiah(s.interest)}</td>
                      <td className="p-2">{rupiah(s.total)}</td>
                      <td className="p-2">{rupiah(s.paid)}</td>
                      <td className={`p-2 font-medium ${s.state === "TERLAMBAT" ? "text-destructive" : ""}`}>{STATE_LABEL[s.state] ?? s.state}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {l.payments.length > 0 ? (
              <section aria-labelledby="bayar-riwayat">
                <h3 id="bayar-riwayat" className="mb-1 font-semibold">Pembayaran</h3>
                <ul className="divide-y rounded-md border text-sm">
                  {l.payments.map((p) => <li key={p.id} className="flex justify-between gap-2 p-2"><span>{day(p.paidAt)}{p.note ? ` · ${p.note}` : ""}</span><span className="font-medium tabular-nums">{rupiah(p.amount)}</span></li>)}
                </ul>
              </section>
            ) : null}
            {data.canManage && l.status === "AKTIF" ? (
              <form onSubmit={async (e) => { e.preventDefault(); if (await submit(`/api/coop/loans/${id}/payments`, "POST", { amount, paidAt }, "Gagal mencatat pembayaran.")) { setAmount(""); reload(); onChanged(); } }} className="space-y-3 rounded-lg border p-3" noValidate>
                <h3 className="font-semibold">Catat pembayaran</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="pay-amount">Jumlah *</Label>
                    <CurrencyInput {...fieldA11y("pay-amount", errors.amount)} inputClassName="h-11" value={amount} onValueChange={setAmount} />
                    <FieldError id="pay-amount" message={errors.amount} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pay-date">Tanggal *</Label>
                    <Input {...fieldA11y("pay-date", errors.paidAt)} className="h-11" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
                    <FieldError id="pay-date" message={errors.paidAt} />
                  </div>
                </div>
                <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ amount: "Jumlah", paidAt: "Tanggal", note: "Catatan" }} />
                <Button type="submit" className="min-h-11" disabled={busy}>
                  {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
                  Simpan pembayaran
                </Button>
              </form>
            ) : null}
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" className="min-h-11" onClick={onClose}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
