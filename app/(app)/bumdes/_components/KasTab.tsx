"use client";

import { useState } from "react";
import { Building2, History, Loader2, Pencil, Plus, Receipt, TrendingDown, TrendingUp, Wallet, Ban } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Textarea } from "@/components/ui/textarea";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { MetricGrid } from "@/components/app/patterns";
import { useApiGet } from "@/hooks/useApiGet";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { localToday } from "@/lib/form-input";
import { DEFAULT_CASH_ACCOUNT, DEFAULT_EXPENSE_ACCOUNT, DEFAULT_INCOME_ACCOUNT, accountName } from "@/lib/bumdes/catalog";
import { fmtDate } from "@/components/app/perencanaan/shared";
import type { useBumdes } from "../_hooks/useBumdes";
import type { BumdesTransactionRow, BumdesUnitRow } from "../_lib/types";
import { AccountSelect } from "./AccountSelect";
import { BumdesUnitDialog } from "./BumdesUnitDialog";
import { Busy, EmptyNote, INPUT_CLASS, ReasonDialog, SELECT_CLASS, StatusPill, rp } from "./shared";

type Hook = ReturnType<typeof useBumdes>;

export function KasTab({ b }: { b: Hook }) {
  const [unitDlg, setUnitDlg] = useState(false);
  const [txDlg, setTxDlg] = useState<BumdesTransactionRow | "new" | null>(null);
  const [voidTx, setVoidTx] = useState<BumdesTransactionRow | null>(null);
  const [history, setHistory] = useState<BumdesTransactionRow | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [journalizing, setJournalizing] = useState(false);
  const stats = b.detail?.overall ?? b.summary?.stats;

  async function afterMutation() {
    await Promise.all([b.refreshUnits(), b.refreshTransactions(), b.refreshDetail(), b.reload()]);
  }
  async function journalize() {
    setJournalizing(true);
    try {
      const res = await fetch("/api/bumdes/transactions/susun-jurnal", { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) toast.error(j?.error ?? "Gagal menyusun jurnal");
      else toast.success(`${j.created} jurnal disusun${j.skippedClosed ? `, ${j.skippedClosed} dilewati (periode tertutup)` : ""}${j.remaining ? `; sisa ${j.remaining}` : ""}.`);
      await afterMutation();
    } finally {
      setJournalizing(false);
    }
  }

  const rows = showAll ? b.transactions : b.transactions.slice(0, 25);
  return (
    <div className="min-w-0 space-y-4">
      <MetricGrid
        columns={4}
        items={[
          { title: "Total pemasukan", value: rp(stats?.totalIncome ?? 0), icon: TrendingUp, accent: "green" },
          { title: "Total pengeluaran", value: rp(stats?.totalExpense ?? 0), icon: TrendingDown, accent: "orange" },
          { title: "Selisih kas", value: rp(stats?.netProfit ?? 0), icon: Wallet, accent: "primary" },
          { title: "Unit usaha aktif", value: stats?.unitCount ?? 0, icon: Building2, accent: "blue" },
        ]}
      />
      <p className="text-xs text-muted-foreground">Ringkasan ini hanya menjumlah transaksi kas yang masih aktif. Laba rugi dan neraca resmi ada di tab Laporan (dari jurnal).</p>

      {b.legacyUnjournaled > 0 ? (
        <div role="status" className="space-y-2 rounded-md border border-amber-600/50 bg-amber-50 p-3 text-sm text-amber-950">
          <p>
            <strong>{b.legacyUnjournaled} transaksi kas belum berjurnal</strong> (dicatat sebelum fitur jurnal ada). Transaksi ini belum masuk neraca dan laba rugi, dan periode tidak dapat ditutup sebelum dijurnal. Akun bawaan: pemasukan ke {accountName(DEFAULT_INCOME_ACCOUNT)}, pengeluaran ke {accountName(DEFAULT_EXPENSE_ACCOUNT)}, kas ke {accountName(DEFAULT_CASH_ACCOUNT)}. Akun dapat diperbaiki lewat tombol Ubah.
          </p>
          {b.canManage ? (
            <Button type="button" className="min-h-11" onClick={() => void journalize()} disabled={journalizing}>
              {journalizing ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              Susun jurnal untuk transaksi lama
            </Button>
          ) : null}
        </div>
      ) : null}

      <section aria-labelledby="bd-unit-h" className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="bd-unit-h" className="text-lg font-semibold">
            Unit usaha
          </h2>
          {b.canManage ? (
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setUnitDlg(true)}>
              <Plus aria-hidden="true" />
              Unit baru
            </Button>
          ) : null}
        </div>
        {b.filteredUnits.length ? (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[34rem] text-sm">
              <caption className="sr-only">Unit usaha BUM Desa dan ringkasan kasnya</caption>
              <thead className="bg-muted text-left">
                <tr>
                  <th scope="col" className="px-3 py-2">Nama</th>
                  <th scope="col" className="px-3 py-2">Kategori</th>
                  <th scope="col" className="px-3 py-2 text-right">Pemasukan</th>
                  <th scope="col" className="px-3 py-2 text-right">Pengeluaran</th>
                  <th scope="col" className="px-3 py-2 text-right">Selisih</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {b.filteredUnits.map((u: BumdesUnitRow) => (
                  <tr key={u.id}>
                    <td className="break-words px-3 py-2 font-medium">{u.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{u.category ?? "-"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{rp(u.totalIncome ?? 0)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{rp(u.totalExpense ?? 0)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{rp(u.netProfit ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyNote>Belum ada unit usaha. Tambahkan unit lebih dulu sebelum mencatat transaksi kas.</EmptyNote>
        )}
      </section>

      <section aria-labelledby="bd-tx-h" className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="bd-tx-h" className="text-lg font-semibold">
              Transaksi kas
            </h2>
            <p className="text-sm text-muted-foreground">Setiap transaksi otomatis menjadi jurnal berpasangan. Koreksi tidak menghapus: isi lama tersimpan di riwayat.</p>
          </div>
          {b.canManage ? (
            <Button type="button" className="min-h-11" onClick={() => setTxDlg("new")} disabled={!b.units.length}>
              <Receipt aria-hidden="true" />
              Catat transaksi
            </Button>
          ) : null}
        </div>
        {b.transactions.length ? (
          <>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[44rem] text-sm">
                <caption className="sr-only">Transaksi kas BUM Desa</caption>
                <thead className="bg-muted text-left">
                  <tr>
                    <th scope="col" className="px-3 py-2">Tanggal</th>
                    <th scope="col" className="px-3 py-2">Unit</th>
                    <th scope="col" className="px-3 py-2">Kategori dan akun</th>
                    <th scope="col" className="px-3 py-2 text-right">Jumlah</th>
                    <th scope="col" className="px-3 py-2">Status</th>
                    <th scope="col" className="px-3 py-2">
                      <span className="sr-only">Aksi</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((t) => {
                    const voided = t.status === "DIBATALKAN";
                    return (
                      <tr key={t.id} className={voided ? "text-muted-foreground" : undefined}>
                        <td className="whitespace-nowrap px-3 py-2">{fmtDate(t.entryDate)}</td>
                        <td className="break-words px-3 py-2">{t.unit?.name ?? "-"}</td>
                        <td className="px-3 py-2">
                          <span className="break-words">{t.category}</span>
                          <span className="block text-xs text-muted-foreground">{t.accountCode ? `${t.accountCode} ${accountName(t.accountCode)}` : "Belum berjurnal"}</span>
                          {voided && t.voidReason ? <span className="block break-words text-xs">Alasan batal: {t.voidReason}</span> : null}
                        </td>
                        <td className={`whitespace-nowrap px-3 py-2 text-right tabular-nums ${voided ? "line-through" : ""}`}>
                          {t.direction === "income" ? "+" : "−"}
                          {rp(Number(t.amount))}
                          <span className="block text-xs text-muted-foreground no-underline">{t.direction === "income" ? "Masuk" : "Keluar"}</span>
                        </td>
                        <td className="px-3 py-2">
                          {voided ? <StatusPill tone="off">Dibatalkan</StatusPill> : <StatusPill tone="ok">Aktif{t.revision > 0 ? ` · rev. ${t.revision}` : ""}</StatusPill>}
                        </td>
                        <td className="whitespace-nowrap px-3 py-1 text-right">
                          {t.revision > 0 || voided ? (
                            <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Riwayat transaksi ${t.category} ${fmtDate(t.entryDate)}`} onClick={() => setHistory(t)}>
                              <History aria-hidden="true" />
                            </Button>
                          ) : null}
                          {b.canManage && !voided ? (
                            <>
                              <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Ubah transaksi ${t.category} ${fmtDate(t.entryDate)}`} onClick={() => setTxDlg(t)}>
                                <Pencil aria-hidden="true" />
                              </Button>
                              <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Batalkan transaksi ${t.category} ${fmtDate(t.entryDate)}`} onClick={() => setVoidTx(t)}>
                                <Ban aria-hidden="true" />
                              </Button>
                            </>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {b.transactions.length > 25 ? (
              <Button type="button" variant="outline" className="min-h-11" onClick={() => setShowAll((v) => !v)}>
                {showAll ? "Tampilkan 25 terbaru" : `Tampilkan semua (${b.transactions.length})`}
              </Button>
            ) : null}
          </>
        ) : (
          <EmptyNote>Belum ada transaksi kas. Catat pemasukan atau pengeluaran pertama setelah unit usaha dibuat.</EmptyNote>
        )}
      </section>

      <BumdesUnitDialog open={unitDlg} onOpenChange={setUnitDlg} onSaved={afterMutation} />
      {txDlg ? <TxDialog tx={txDlg === "new" ? null : txDlg} units={b.units} onClose={() => setTxDlg(null)} onDone={() => { setTxDlg(null); void afterMutation(); }} /> : null}
      {voidTx ? (
        <ReasonDialog
          title="Batalkan transaksi kas?"
          description={`${voidTx.category} sebesar ${rp(Number(voidTx.amount))} (${fmtDate(voidTx.entryDate)}) dibatalkan. Baris tidak dihapus: tetap tampil berstatus Dibatalkan beserta alasannya, dan jurnalnya ikut dibatalkan.`}
          confirmLabel="Batalkan transaksi"
          destructive
          url={`/api/bumdes/transactions/${voidTx.id}/batal`}
          onClose={() => setVoidTx(null)}
          onDone={() => { setVoidTx(null); void afterMutation(); }}
        />
      ) : null}
      {history ? <HistoryDialog tx={history} onClose={() => setHistory(null)} /> : null}
    </div>
  );
}

function TxDialog({ tx, units, onClose, onDone }: { tx: BumdesTransactionRow | null; units: BumdesUnitRow[]; onClose: () => void; onDone: () => void }) {
  const edit = tx !== null;
  const [unitId, setUnitId] = useState(tx ? String(tx.unitId) : units.length === 1 ? String(units[0]!.id) : "");
  const [date, setDate] = useState(tx ? tx.entryDate.slice(0, 10) : localToday());
  const [direction, setDirection] = useState<"income" | "expense">(tx?.direction ?? "income");
  const [amount, setAmount] = useState(tx ? String(Math.round(Number(tx.amount))) : "");
  const [category, setCategory] = useState(tx?.category ?? "");
  const [accountCode, setAccountCode] = useState(tx?.accountCode ?? (tx?.direction === "expense" ? DEFAULT_EXPENSE_ACCOUNT : DEFAULT_INCOME_ACCOUNT));
  const [cashAccountCode, setCashAccountCode] = useState(tx?.cashAccountCode ?? DEFAULT_CASH_ACCOUNT);
  const [description, setDescription] = useState(tx?.description ?? "");
  const [reason, setReason] = useState("");
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const labels = { unitId: "Unit usaha", entryDate: "Tanggal", direction: "Jenis", amount: "Jumlah", category: "Kategori", accountCode: "Akun lawan", cashAccountCode: "Akun kas", description: "Uraian", reason: "Alasan" };

  function changeDirection(d: "income" | "expense") {
    setDirection(d);
    if (!edit || accountCode === DEFAULT_INCOME_ACCOUNT || accountCode === DEFAULT_EXPENSE_ACCOUNT) setAccountCode(d === "expense" ? DEFAULT_EXPENSE_ACCOUNT : DEFAULT_INCOME_ACCOUNT);
  }
  async function go(e: React.FormEvent) {
    e.preventDefault();
    const body = { unitId, entryDate: date, direction, amount, category, accountCode, cashAccountCode, description, ...(edit ? { reason } : {}) };
    if (await submit(edit ? `/api/bumdes/transactions/${tx.id}` : "/api/bumdes/transactions", edit ? "PATCH" : "POST", body)) {
      toast.success(edit ? "Transaksi dikoreksi; riwayat tersimpan" : "Transaksi dicatat beserta jurnalnya");
      onDone();
    }
  }
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{edit ? "Ubah transaksi kas" : "Catat transaksi kas"}</DialogTitle>
          <DialogDescription>{edit ? "Jurnal lama dibatalkan dan diganti jurnal baru; isi lama tersimpan di riwayat." : "Jurnal berpasangan dibuat otomatis: pemasukan = debit kas, kredit akun lawan; pengeluaran sebaliknya."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="min-w-0 space-y-4" noValidate>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={labels} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="bd-tx-unit">Unit usaha *</Label>
              <SearchSelect id="bd-tx-unit" className={SELECT_CLASS} value={unitId} onChange={(e) => setUnitId(e.target.value)} aria-invalid={Boolean(errors.unitId)} placeholder="Pilih unit">
                <option value="">Pilih unit</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </SearchSelect>
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="bd-tx-date">Tanggal *</Label>
              <Input id="bd-tx-date" type="date" className={INPUT_CLASS} value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={Boolean(errors.entryDate)} />
            </div>
          </div>
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">Jenis *</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["income", "expense"] as const).map((d) => (
                <label key={d} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm ${direction === d ? "border-primary bg-primary/5 font-medium" : ""}`}>
                  <input type="radio" name="bd-dir" className="size-4" checked={direction === d} onChange={() => changeDirection(d)} />
                  {d === "income" ? "Pemasukan" : "Pengeluaran"}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="bd-tx-amt">Jumlah *</Label>
              <CurrencyInput id="bd-tx-amt" inputClassName="h-11" value={amount} onValueChange={setAmount} aria-invalid={Boolean(errors.amount)} />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="bd-tx-cat">Kategori *</Label>
              <Input id="bd-tx-cat" className={INPUT_CLASS} maxLength={100} value={category} onChange={(e) => setCategory(e.target.value)} aria-invalid={Boolean(errors.category)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bd-tx-acc">{direction === "income" ? "Akun pendapatan (kredit)" : "Akun beban (debit)"} *</Label>
            <AccountSelect id="bd-tx-acc" value={accountCode} onChange={setAccountCode} invalid={Boolean(errors.accountCode)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bd-tx-cash">Akun kas atau bank *</Label>
            <AccountSelect id="bd-tx-cash" only="cash" value={cashAccountCode} onChange={setCashAccountCode} invalid={Boolean(errors.cashAccountCode)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bd-tx-desc">Uraian</Label>
            <Textarea id="bd-tx-desc" rows={2} maxLength={5000} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {edit ? (
            <div className="space-y-1.5">
              <Label htmlFor="bd-tx-reason">Alasan koreksi *</Label>
              <Textarea id="bd-tx-reason" rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={Boolean(errors.reason)} />
            </div>
          ) : null}
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

type Hist = { revisions: { revision: number; action: string; reason: string; before: Record<string, unknown>; after: Record<string, unknown> | null; at: string }[] };
/** Nilai riwayat dalam bentuk yang dibaca orang: rupiah, tanggal, jenis, nama akun. */
function showVal(k: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return "-";
  const s = String(v);
  if (k === "amount") return rp(s);
  if (k === "entryDate") return fmtDate(s);
  if (k === "direction") return s === "income" ? "Pemasukan" : s === "expense" ? "Pengeluaran" : s;
  if (k === "status") return s === "AKTIF" ? "Aktif" : s === "DIBATALKAN" ? "Dibatalkan" : s;
  if (k === "accountCode" || k === "cashAccountCode") return `${s} ${accountName(s)}`;
  return s;
}

const FIELD: Record<string, string> = { entryDate: "Tanggal", direction: "Jenis", amount: "Jumlah", category: "Kategori", description: "Uraian", unitId: "Unit", accountCode: "Akun lawan", cashAccountCode: "Akun kas", status: "Status" };

function HistoryDialog({ tx, onClose }: { tx: BumdesTransactionRow; onClose: () => void }) {
  const { data, loading, error } = useApiGet<Hist>(`/api/bumdes/transactions/${tx.id}/riwayat`);
  return (
    <Dialog open onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Riwayat transaksi</DialogTitle>
          <DialogDescription>
            {tx.category} · {fmtDate(tx.entryDate)}
          </DialogDescription>
        </DialogHeader>
        {loading ? <Busy>Memuat riwayat…</Busy> : null}
        {error ? <p role="alert" className="text-destructive">{error}</p> : null}
        {data ? (
          <ol className="min-w-0 space-y-3">
            {data.revisions.map((r) => {
              const changed = Object.keys(r.before).filter((k) => r.after && JSON.stringify(r.before[k]) !== JSON.stringify(r.after[k]));
              return (
                <li key={r.revision} className="space-y-1 rounded-md border p-3 text-sm">
                  <p className="font-medium">
                    Revisi {r.revision}: {r.action === "BATAL" ? "dibatalkan" : "diubah"} · {new Date(r.at).toLocaleString("id-ID")}
                  </p>
                  <p className="break-words">Alasan: {r.reason}</p>
                  {changed.length ? (
                    <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
                      {changed.map((k) => (
                        <li key={k} className="break-words">
                          {FIELD[k] ?? k}: {showVal(k, r.before[k])} → {showVal(k, r.after?.[k])}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ol>
        ) : null}
        <DialogFooter>
          <Button type="button" className="min-h-11" onClick={onClose}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

