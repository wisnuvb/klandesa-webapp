"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormErrorSummary, fieldA11y } from "@/components/app/FormErrorSummary";
import { useApiGet } from "@/hooks/useApiGet";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { day, rupiah, SELECT_CLASS, type MemberBalance, type SavingsResponse } from "./shared";
import { SearchSelect } from "@/components/ui/search-select";

export function SimpananTab() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApiGet<SavingsResponse>(`/api/coop/savings?page=${page}`);
  const [adding, setAdding] = useState<MemberBalance | "new" | null>(null);

  return (
    <div className="space-y-5">
      {loading ? <p role="status" className="flex items-center gap-2 p-4 text-muted-foreground"><Loader2 aria-hidden="true" className="size-5 animate-spin" />Memuat simpanan…</p> : null}
      {error ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          <p>{error}</p>
          <Button type="button" variant="outline" className="min-h-11" onClick={reload}>Coba lagi</Button>
        </div>
      ) : null}
      {data ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <dl className="grid flex-1 grid-cols-2 gap-3 lg:grid-cols-4">
              {([["Simpanan pokok", data.totals.pokok], ["Simpanan wajib", data.totals.wajib], ["Simpanan sukarela", data.totals.sukarela], ["Total simpanan", data.totals.total]] as const).map(([l, v]) => (
                <div key={l} className="rounded-lg border p-3">
                  <dt className="text-sm text-muted-foreground">{l}</dt>
                  <dd className="mt-1 font-semibold tabular-nums">{rupiah(v)}</dd>
                </div>
              ))}
            </dl>
            {data.canManage ? (
              <Button type="button" className="min-h-11" onClick={() => setAdding("new")}>
                <Plus aria-hidden="true" />
                Catat transaksi
              </Button>
            ) : null}
          </div>

          {data.members.length === 0 ? <p className="rounded-lg border border-dashed p-6 text-center">Belum ada anggota koperasi. Tambahkan anggota di halaman Koperasi.</p> : (
            <ul className="space-y-2">
              {data.members.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="break-words font-medium">{m.name}{!m.active ? <span className="ml-2 rounded border px-1.5 py-0.5 text-xs font-normal text-muted-foreground">Tidak aktif</span> : null}</p>
                    <p className="text-sm text-muted-foreground tabular-nums">Pokok {rupiah(m.pokok)} · Wajib {rupiah(m.wajib)} · Sukarela {rupiah(m.sukarela)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-semibold tabular-nums">{rupiah(m.total)}</p>
                    {data.canManage ? <Button type="button" variant="outline" className="min-h-11" onClick={() => setAdding(m)} aria-label={`Catat transaksi ${m.name}`}>Transaksi</Button> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <section aria-labelledby="riwayat-simpanan" className="space-y-2">
            <h2 id="riwayat-simpanan" className="font-semibold">Riwayat transaksi</h2>
            {data.history.items.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada transaksi.</p> : (
              <ul className="divide-y rounded-lg border">
                {data.history.items.map((h) => (
                  <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                    <span className="min-w-0">
                      <span className="font-medium">{h.memberName}</span> · {data.kinds[h.kind]} · {day(h.txDate)}
                      {h.note ? <span className="text-muted-foreground"> · {h.note}</span> : null}
                    </span>
                    <span className={`font-semibold tabular-nums ${h.direction === "TARIK" ? "text-destructive" : ""}`}>{h.direction === "TARIK" ? "−" : "+"}{rupiah(h.amount)} <span className="sr-only">{h.direction === "TARIK" ? "penarikan" : "setoran"}</span></span>
                  </li>
                ))}
              </ul>
            )}
            {data.history.total > 25 ? (
              <div className="flex items-center justify-between gap-3">
                <Button type="button" variant="outline" className="min-h-11" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Sebelumnya</Button>
                <p className="text-sm text-muted-foreground" aria-live="polite">Halaman {page} dari {Math.ceil(data.history.total / 25)}</p>
                <Button type="button" variant="outline" className="min-h-11" disabled={page >= Math.ceil(data.history.total / 25)} onClick={() => setPage((p) => p + 1)}>Berikutnya</Button>
              </div>
            ) : null}
          </section>
        </>
      ) : null}

      {adding && data ? <SavingDialog members={data.members} kinds={data.kinds} member={adding === "new" ? null : adding} onClose={() => setAdding(null)} onSaved={() => { setAdding(null); reload(); }} /> : null}
    </div>
  );
}

const LABELS: Record<string, string> = { memberId: "Anggota", kind: "Jenis", direction: "Jenis transaksi", amount: "Jumlah", txDate: "Tanggal", note: "Catatan" };

function SavingDialog({ members, kinds, member, onClose, onSaved }: { members: MemberBalance[]; kinds: Record<string, string>; member: MemberBalance | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ memberId: member ? String(member.id) : "", kind: "SUKARELA", direction: "SETOR", amount: "", txDate: new Date().toISOString().slice(0, 10), note: "" });
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Catat transaksi simpanan</DialogTitle>
          <DialogDescription>Transaksi tidak dapat diubah atau dihapus; bila salah, catat transaksi lawan beserta catatannya.</DialogDescription>
        </DialogHeader>
        <form onSubmit={async (e) => { e.preventDefault(); if (await submit("/api/coop/savings", "POST", { ...f, memberId: Number(f.memberId) || undefined, amount: f.amount })) onSaved(); }} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="sv-member">Anggota *</Label>
            <SearchSelect {...fieldA11y("sv-member", errors.memberId)} className={SELECT_CLASS} value={f.memberId} onChange={(e) => set({ memberId: e.target.value })}>
              <option value="">Pilih anggota…</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}{m.active ? "" : " (tidak aktif)"}</option>)}
            </SearchSelect>
            <FieldError id="sv-member" message={errors.memberId} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sv-kind">Jenis simpanan *</Label>
              <SearchSelect {...fieldA11y("sv-kind", errors.kind)} className={SELECT_CLASS} value={f.kind} onChange={(e) => set({ kind: e.target.value })}>
                {Object.entries(kinds).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </SearchSelect>
              <FieldError id="sv-kind" message={errors.kind} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sv-direction">Transaksi *</Label>
              <SearchSelect {...fieldA11y("sv-direction", errors.direction)} className={SELECT_CLASS} value={f.direction} onChange={(e) => set({ direction: e.target.value })}>
                <option value="SETOR">Setoran</option>
                <option value="TARIK">Penarikan</option>
              </SearchSelect>
              <FieldError id="sv-direction" message={errors.direction} />
            </div>
          </div>
          {f.direction === "TARIK" && f.kind !== "SUKARELA" ? <p className="text-sm text-muted-foreground">Simpanan pokok dan wajib hanya dapat dikembalikan setelah anggota tidak aktif.</p> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sv-amount">Jumlah *</Label>
              <CurrencyInput {...fieldA11y("sv-amount", errors.amount)} inputClassName="h-11" value={f.amount} onValueChange={(d) => set({ amount: d })} />
              <FieldError id="sv-amount" message={errors.amount} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sv-txDate">Tanggal *</Label>
              <Input {...fieldA11y("sv-txDate", errors.txDate)} className="h-11" type="date" value={f.txDate} onChange={(e) => set({ txDate: e.target.value })} />
              <FieldError id="sv-txDate" message={errors.txDate} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sv-note">Catatan</Label>
            <Input {...fieldA11y("sv-note", errors.note)} className="h-11" value={f.note} maxLength={200} onChange={(e) => set({ note: e.target.value })} />
            <FieldError id="sv-note" message={errors.note} />
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
