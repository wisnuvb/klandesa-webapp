"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Pencil, Plus, Recycle, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormErrorSummary, fieldA11y } from "@/components/app/FormErrorSummary";
import { ResidentPicker } from "@/components/app/ResidentPicker";
import { useApiGet } from "@/hooks/useApiGet";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import type { ResidentPick } from "@/lib/kependudukan/mutasi-labels";
import { SearchSelect } from "@/components/ui/search-select";

interface Ledger {
  bank: { id: number; name: string };
  items: { id: number; name: string; pricePerKg: string; active: boolean }[];
  accounts: { id: number; name: string; balance: string }[];
  totalBalance: string;
  recent: { id: number; accountName: string; kind: string; itemName: string | null; weightKg: string | null; amount: string; txDate: string; note: string | null }[];
  month: { from: string; totalKg: string; totalValue: string; byItem: { itemName: string; kg: string; value: string }[] };
}

const SELECT_CLASS =
  "flex h-11 w-full rounded-md border border-input bg-input-background px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm";
const rupiah = (v: string | number) => `Rp${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(Number(v))}`;
const kg = (v: string) => `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 3 }).format(Number(v))} kg`;
const day = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const today = () => new Date().toISOString().slice(0, 10);

type Dlg = { t: "item"; item: Ledger["items"][number] | null } | { t: "account" } | { t: "deposit" | "withdraw"; accountId: number };

export function BankSampahView({ bankId }: { bankId: string }) {
  const { data, loading, error, reload } = useApiGet<Ledger>(`/api/lingkungan/waste-banks/${bankId}/ledger`);
  const [dlg, setDlg] = useState<Dlg | null>(null);
  const done = () => { setDlg(null); reload(); };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Button asChild variant="ghost" className="min-h-11">
          <Link href="/lingkungan">
            <ArrowLeft aria-hidden="true" />
            Kembali ke Lingkungan
          </Link>
        </Button>
        <header className="space-y-2">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Recycle aria-hidden="true" className="size-6" />
            {data ? data.bank.name : "Bank Sampah"}
          </h1>
          <p className="max-w-prose text-muted-foreground">Catat setoran sampah nasabah dan tabungannya. Nilai setoran = berat x harga per kg saat itu; transaksi tidak dapat diubah, koreksi dengan transaksi lawan.</p>
        </header>
      </div>

      {loading ? <p role="status" className="flex items-center gap-2 p-6 text-muted-foreground"><Loader2 aria-hidden="true" className="size-5 animate-spin" />Memuat…</p> : null}
      {error ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          <p>{error}</p>
          <Button type="button" variant="outline" className="min-h-11" onClick={reload}>Coba lagi</Button>
        </div>
      ) : null}

      {data ? (
        <>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <div className="rounded-lg border p-4"><dt className="text-sm text-muted-foreground">Sampah bulan ini</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{kg(data.month.totalKg)}</dd></div>
            <div className="rounded-lg border p-4"><dt className="text-sm text-muted-foreground">Nilai setoran bulan ini</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{rupiah(data.month.totalValue)}</dd></div>
            <div className="rounded-lg border p-4"><dt className="text-sm text-muted-foreground">Total tabungan nasabah</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{rupiah(data.totalBalance)}</dd></div>
          </dl>
          {data.month.byItem.length > 0 ? (
            <p className="text-sm text-muted-foreground">Bulan ini: {data.month.byItem.map((i) => `${i.itemName} ${kg(i.kg)}`).join(" · ")}</p>
          ) : null}

          <section aria-labelledby="bs-harga" className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="bs-harga" className="text-lg font-semibold">Harga sampah per kg</h2>
              <Button type="button" variant="outline" className="min-h-11" onClick={() => setDlg({ t: "item", item: null })}><Plus aria-hidden="true" />Tambah jenis</Button>
            </div>
            {data.items.length === 0 ? <p className="rounded-lg border border-dashed p-4 text-center text-sm">Belum ada jenis sampah. Tambahkan jenis dan harganya lebih dulu.</p> : (
              <ul className="divide-y rounded-lg border">
                {data.items.map((i) => (
                  <li key={i.id} className={`flex flex-wrap items-center justify-between gap-2 p-3 ${i.active ? "" : "text-muted-foreground"}`}>
                    <span className="min-w-0 break-words">{i.name}{!i.active ? " (tidak diterima)" : ""}</span>
                    <span className="flex items-center gap-2">
                      <span className="font-medium tabular-nums">{rupiah(i.pricePerKg)}/kg</span>
                      <Button type="button" variant="outline" className="min-h-11" onClick={() => setDlg({ t: "item", item: i })} aria-label={`Ubah ${i.name}`}><Pencil aria-hidden="true" />Ubah</Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="bs-nasabah" className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="bs-nasabah" className="text-lg font-semibold">Nasabah</h2>
              <Button type="button" variant="outline" className="min-h-11" onClick={() => setDlg({ t: "account" })}><UserPlus aria-hidden="true" />Daftarkan nasabah</Button>
            </div>
            {data.accounts.length === 0 ? <p className="rounded-lg border border-dashed p-4 text-center text-sm">Belum ada nasabah.</p> : (
              <ul className="space-y-2">
                {data.accounts.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                    <div className="min-w-0"><p className="break-words font-medium">{a.name}</p><p className="text-sm tabular-nums text-muted-foreground">Tabungan {rupiah(a.balance)}</p></div>
                    <div className="flex gap-2">
                      <Button type="button" className="min-h-11" disabled={data.items.every((i) => !i.active)} onClick={() => setDlg({ t: "deposit", accountId: a.id })} aria-label={`Setor sampah ${a.name}`}>Setor</Button>
                      <Button type="button" variant="outline" className="min-h-11" disabled={Number(a.balance) <= 0} onClick={() => setDlg({ t: "withdraw", accountId: a.id })} aria-label={`Tarik saldo ${a.name}`}>Tarik</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="bs-riwayat" className="space-y-2">
            <h2 id="bs-riwayat" className="text-lg font-semibold">Transaksi terbaru</h2>
            {data.recent.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada transaksi.</p> : (
              <ul className="divide-y rounded-lg border text-sm">
                {data.recent.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                    <span className="min-w-0"><span className="font-medium">{t.accountName}</span> · {day(t.txDate)} · {t.kind === "DEPOSIT" ? `setor ${t.itemName ?? ""} ${t.weightKg ? kg(t.weightKg) : ""}` : "tarik saldo"}{t.note ? ` · ${t.note}` : ""}</span>
                    <span className={`font-semibold tabular-nums ${t.kind === "WITHDRAW" ? "text-destructive" : ""}`}>{t.kind === "WITHDRAW" ? "−" : "+"}{rupiah(t.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}

      {dlg?.t === "item" && data ? <ItemDialog bankId={bankId} item={dlg.item} onClose={() => setDlg(null)} onSaved={done} /> : null}
      {dlg?.t === "account" ? <AccountDialog bankId={bankId} onClose={() => setDlg(null)} onSaved={done} /> : null}
      {(dlg?.t === "deposit" || dlg?.t === "withdraw") && data ? <TxDialog bankId={bankId} kind={dlg.t === "deposit" ? "DEPOSIT" : "WITHDRAW"} account={data.accounts.find((a) => a.id === dlg.accountId)!} items={data.items.filter((i) => i.active)} onClose={() => setDlg(null)} onSaved={done} /> : null}
    </div>
  );
}

function Actions({ busy, onClose, label }: { busy: boolean; onClose: () => void; label: string }) {
  return (
    <DialogFooter className="gap-2 sm:gap-2">
      <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>Batal</Button>
      <Button type="submit" className="min-h-11" disabled={busy}>
        {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
        {busy ? "Menyimpan…" : label}
      </Button>
    </DialogFooter>
  );
}

function ItemDialog({ bankId, item, onClose, onSaved }: { bankId: string; item: Ledger["items"][number] | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(item?.name ?? "");
  const [price, setPrice] = useState(item ? item.pricePerKg.replace(/\.00$/, "") : "");
  const [active, setActive] = useState(item?.active ?? true);
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? "Ubah jenis sampah" : "Tambah jenis sampah"}</DialogTitle>
          <DialogDescription>Harga baru hanya berlaku untuk setoran berikutnya; setoran lama tetap memakai harga saat itu.</DialogDescription>
        </DialogHeader>
        <form onSubmit={async (e) => { e.preventDefault(); if (await submit(`/api/lingkungan/waste-banks/${bankId}/items`, "POST", { name, pricePerKg: price, active, ...(item ? { itemId: item.id } : {}) })) onSaved(); }} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="it-name">Jenis sampah *</Label>
            <Input {...fieldA11y("it-name", errors.name)} className="h-11" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Botol plastik" />
            <FieldError id="it-name" message={errors.name} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="it-price">Harga per kg *</Label>
            <CurrencyInput {...fieldA11y("it-price", errors.pricePerKg)} inputClassName="h-11" value={price} onValueChange={setPrice} />
            <FieldError id="it-price" message={errors.pricePerKg} />
          </div>
          {item ? (
            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border p-3">
              <input type="checkbox" className="size-5" checked={active} onChange={(e) => setActive(e.target.checked)} />
              <span>Sedang diterima</span>
            </label>
          ) : null}
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ name: "Jenis sampah", pricePerKg: "Harga" }} />
          <Actions busy={busy} onClose={onClose} label="Simpan" />
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AccountDialog({ bankId, onClose, onSaved }: { bankId: string; onClose: () => void; onSaved: () => void }) {
  const [resident, setResident] = useState<ResidentPick | null>(null);
  const [name, setName] = useState("");
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Daftarkan nasabah</DialogTitle>
          <DialogDescription>Pilih dari data warga, atau ketik nama bila nasabah bukan warga terdaftar.</DialogDescription>
        </DialogHeader>
        <form onSubmit={async (e) => { e.preventDefault(); if (await submit(`/api/lingkungan/waste-banks/${bankId}/accounts`, "POST", { residentId: resident?.id ?? null, name })) onSaved(); }} className="space-y-4" noValidate>
          <ResidentPicker value={resident} onChange={(r) => { setResident(r); if (r && !name) setName(r.name); }} label="Cari dari data warga (opsional)" />
          <FieldError id="ac-resident" message={errors.residentId} />
          <div className="space-y-1.5">
            <Label htmlFor="ac-name">Nama nasabah</Label>
            <Input {...fieldA11y("ac-name", errors.name)} className="h-11" value={name} maxLength={150} onChange={(e) => setName(e.target.value)} />
            <FieldError id="ac-name" message={errors.name} />
          </div>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ name: "Nama", residentId: "Warga" }} />
          <Actions busy={busy} onClose={onClose} label="Daftarkan" />
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TxDialog({ bankId, kind, account, items, onClose, onSaved }: { bankId: string; kind: "DEPOSIT" | "WITHDRAW"; account: Ledger["accounts"][number]; items: Ledger["items"]; onClose: () => void; onSaved: () => void }) {
  const [itemId, setItemId] = useState("");
  const [weight, setWeight] = useState("");
  const [amount, setAmount] = useState("");
  const [txDate, setTxDate] = useState(today());
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const picked = items.find((i) => String(i.id) === itemId);
  const estimate = picked && /^\d+(\.\d{1,3})?$/.test(weight) ? Math.round(Number(weight) * Number(picked.pricePerKg)) : null;
  const dep = kind === "DEPOSIT";
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dep ? "Setor sampah" : "Tarik saldo"}: {account.name}</DialogTitle>
          <DialogDescription>Tabungan saat ini {rupiah(account.balance)}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={async (e) => { e.preventDefault(); if (await submit(`/api/lingkungan/waste-banks/${bankId}/transactions`, "POST", dep ? { kind, accountId: account.id, itemId: Number(itemId) || undefined, weightKg: weight, txDate } : { kind, accountId: account.id, amount, txDate })) onSaved(); }} className="space-y-4" noValidate>
          {dep ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="tx-item">Jenis sampah *</Label>
                <SearchSelect {...fieldA11y("tx-item", errors.itemId)} className={SELECT_CLASS} value={itemId} onChange={(e) => setItemId(e.target.value)}>
                  <option value="">Pilih jenis…</option>
                  {items.map((i) => <option key={i.id} value={i.id}>{i.name} ({rupiah(i.pricePerKg)}/kg)</option>)}
                </SearchSelect>
                <FieldError id="tx-item" message={errors.itemId} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tx-weight">Berat (kg) *</Label>
                <Input {...fieldA11y("tx-weight", errors.weightKg)} className="h-11" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value.replace(",", "."))} placeholder="Contoh: 2.5" />
                {estimate !== null ? <p className="text-sm text-muted-foreground" aria-live="polite">Perkiraan nilai: {rupiah(estimate)}</p> : null}
                <FieldError id="tx-weight" message={errors.weightKg} />
              </div>
            </>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="tx-amount">Jumlah penarikan *</Label>
              <CurrencyInput {...fieldA11y("tx-amount", errors.amount)} inputClassName="h-11" value={amount} onValueChange={setAmount} />
              <FieldError id="tx-amount" message={errors.amount} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="tx-date">Tanggal *</Label>
            <Input {...fieldA11y("tx-date", errors.txDate)} className="h-11" type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} />
            <FieldError id="tx-date" message={errors.txDate} />
          </div>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ accountId: "Nasabah", itemId: "Jenis sampah", weightKg: "Berat", amount: "Jumlah", txDate: "Tanggal" }} />
          <Actions busy={busy} onClose={onClose} label={dep ? "Simpan setoran" : "Simpan penarikan"} />
        </form>
      </DialogContent>
    </Dialog>
  );
}
