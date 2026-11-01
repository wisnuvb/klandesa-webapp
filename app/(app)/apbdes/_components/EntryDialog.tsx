"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormErrorSummary, fieldA11y } from "@/components/app/FormErrorSummary";
import { useApiGet } from "@/hooks/useApiGet";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import type { EntryView, LineView } from "@/lib/apbdes/service";
import { localToday } from "@/lib/form-input";
import { MoneyInput } from "./MoneyInput";
import { SELECT_CLASS, type Overview } from "./shared";
import { SearchSelect } from "@/components/ui/search-select";

const LABELS = { entryDate: "Tanggal", voucherNo: "Nomor bukti", type: "Jenis", channel: "Kas", accountCode: "Rekening", activityCode: "Kegiatan", description: "Uraian", amount: "Jumlah", taxAmount: "Pajak dipotong", taxKind: "Jenis pajak" };
const today = localToday;

export function EntryDialog({ o, entry, defaultMonth, onClose, onSaved }: { o: Overview; entry: EntryView | null; defaultMonth: number | null; onClose: () => void; onSaved: () => void }) {
  const now = new Date();
  const mm = defaultMonth ? String(defaultMonth).padStart(2, "0") : null;
  // Bulan lampau: tanggal 1 bulan itu; bulan berjalan atau mendatang: hari ini (tanggal masa depan ditolak server).
  const pastMonth = mm !== null && (o.year < now.getFullYear() || (o.year === now.getFullYear() && defaultMonth! < now.getMonth() + 1));
  const initialDate = entry?.entryDate ?? (pastMonth ? `${o.year}-${mm}-01` : today());
  const [f, setF] = useState({
    type: entry?.type ?? "PENERIMAAN",
    entryDate: initialDate,
    voucherNo: entry?.voucherNo ?? "",
    description: entry?.description ?? "",
    channel: entry?.channel ?? "BANK",
    spendKey: entry ? `${entry.activityCode ?? ""}|${entry.accountCode ?? ""}` : "",
    accountCode: entry?.accountCode ?? "",
    amount: entry ? entry.amount.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1") : "",
    taxAmount: entry && Number(entry.tax) > 0 ? entry.tax.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1") : "",
    taxKind: entry?.taxKind ?? "",
    bankFee: entry?.bankFee ?? false,
  });
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const doc = useApiGet<{ document: { lines: LineView[] } }>(f.type === "PENGELUARAN" && o.activeDocumentId ? `/api/apbdes/dokumen/${o.activeDocumentId}` : null);
  const spendOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const l of doc.data?.document.lines ?? []) {
      if (l.accountCode.startsWith("4.") || l.accountCode.startsWith("6.1.")) continue;
      const key = `${l.activityCode ?? ""}|${l.accountCode}`;
      if (!seen.has(key)) seen.set(key, `${l.activityCode ? `${l.activityCode} · ` : ""}${l.accountCode} · ${l.description}`.slice(0, 120));
    }
    return [...seen];
  }, [doc.data]);

  const isTransfer = f.type === "TARIK_BANK" || f.type === "SETOR_BANK";

  return (
    <Dialog open onOpenChange={(open) => (!open && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{entry ? "Ubah catatan kas" : "Catat transaksi kas"}</DialogTitle>
          <DialogDescription>Dicatat ke Buku Kas Umum tahun {o.year}. Catatan pada bulan yang sudah ditutup tidak dapat diubah. Tanda * wajib diisi.</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const [activityCode, spendAccount] = f.spendKey.split("|");
            const body = {
              type: f.type,
              entryDate: f.entryDate,
              voucherNo: f.voucherNo,
              description: f.description,
              channel: f.channel,
              amount: f.amount,
              accountCode: f.type === "PENGELUARAN" ? spendAccount : f.type === "PENERIMAAN" ? f.accountCode : "",
              activityCode: f.type === "PENGELUARAN" ? activityCode : "",
              taxAmount: f.type === "PENGELUARAN" ? f.taxAmount : "",
              taxKind: f.type === "PENGELUARAN" && f.taxAmount ? f.taxKind : "",
              bankFee: f.type === "PENGELUARAN" ? f.bankFee : false,
            };
            if (await submit(entry ? `/api/apbdes/bku/${entry.id}` : "/api/apbdes/bku", entry ? "PUT" : "POST", body)) onSaved();
          }}
        >
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={LABELS} />
          <div className="space-y-1.5">
            <Label htmlFor="en-type">Jenis *</Label>
            <SearchSelect {...fieldA11y("en-type", errors.type)} className={SELECT_CLASS} value={f.type} onChange={(e) => set({ type: e.target.value, spendKey: "", accountCode: "", bankFee: false, taxAmount: "", taxKind: "" })}>
              {Object.entries(o.terms.entryTypes).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </SearchSelect>
            <FieldError id="en-type" message={errors.type} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="en-date">Tanggal *</Label>
              <Input {...fieldA11y("en-date", errors.entryDate)} className="h-11" type="date" value={f.entryDate} min={`${o.year}-01-01`} max={`${o.year}-12-31`} onChange={(e) => set({ entryDate: e.target.value })} />
              <FieldError id="en-date" message={errors.entryDate} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="en-voucher">Nomor bukti *</Label>
              <Input {...fieldA11y("en-voucher", errors.voucherNo)} className="h-11" maxLength={60} value={f.voucherNo} onChange={(e) => set({ voucherNo: e.target.value })} />
              <FieldError id="en-voucher" message={errors.voucherNo} />
            </div>
          </div>

          {!isTransfer ? (
            <div className="space-y-1.5">
              <Label htmlFor="en-channel">Uang {f.type === "PENERIMAAN" ? "masuk ke" : "keluar dari"} *</Label>
              <SearchSelect {...fieldA11y("en-channel", errors.channel)} className={SELECT_CLASS} value={f.type === "PENGELUARAN" && f.bankFee ? "BANK" : f.channel} disabled={f.type === "PENGELUARAN" && f.bankFee} onChange={(e) => set({ channel: e.target.value })}>
                {Object.entries(o.terms.channels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </SearchSelect>
              <FieldError id="en-channel" message={errors.channel} />
            </div>
          ) : (
            <p className="rounded-md bg-muted p-3 text-sm">{f.type === "TARIK_BANK" ? "Uang berpindah dari rekening bank ke kas tunai." : "Uang berpindah dari kas tunai ke rekening bank."} Saldo gabungan tidak berubah.</p>
          )}

          {f.type === "PENERIMAAN" ? (
            <div className="space-y-1.5">
              <Label htmlFor="en-account">Rekening penerimaan *</Label>
              <SearchSelect {...fieldA11y("en-account", errors.accountCode)} className={SELECT_CLASS} value={f.accountCode} onChange={(e) => set({ accountCode: e.target.value })}>
                <option value="">Pilih rekening…</option>
                <optgroup label="Pendapatan">
                  {o.terms.incomeAccounts.map((a) => <option key={a.code} value={a.code.replace("90-99", "90")}>{`${a.code.replace("90-99", "90")} ${a.name}`.slice(0, 120)}</option>)}
                </optgroup>
                <optgroup label="Penerimaan pembiayaan (saldo kas awal tahun = SiLPA tahun sebelumnya)">
                  {o.terms.financingAccounts.filter((a) => a.code.startsWith("6.1.")).map((a) => <option key={a.code} value={a.code.replace("90-99", "90")}>{`${a.code.replace("90-99", "90")} ${a.name}`.slice(0, 120)}</option>)}
                </optgroup>
              </SearchSelect>
              <FieldError id="en-account" message={errors.accountCode} />
            </div>
          ) : null}

          {f.type === "PENGELUARAN" ? (
            <div className="space-y-1.5">
              <Label htmlFor="en-spend">Kegiatan dan rekening belanja *</Label>
              {!o.activeDocumentId ? <p role="alert" className="text-sm text-destructive">APB Desa belum ditetapkan, belanja belum dapat dicatat.</p> : null}
              <SearchSelect {...fieldA11y("en-spend", errors.accountCode ?? errors.activityCode)} className={SELECT_CLASS} value={f.spendKey} onChange={(e) => set({ spendKey: e.target.value })} disabled={!o.activeDocumentId || doc.loading}>
                <option value="">{doc.loading ? "Memuat anggaran…" : "Pilih dari APB Desa…"}</option>
                {spendOptions.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </SearchSelect>
              <p className="text-sm text-muted-foreground">Hanya rekening yang ada di {o.activeLabel ?? "APB Desa"}. Belanja tidak boleh melebihi pagu.</p>
              <FieldError id="en-spend" message={errors.accountCode ?? errors.activityCode} />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="en-desc">Uraian *</Label>
            <Input {...fieldA11y("en-desc", errors.description)} className="h-11" maxLength={300} value={f.description} onChange={(e) => set({ description: e.target.value })} />
            <FieldError id="en-desc" message={errors.description} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="en-amount">Jumlah {f.type === "PENGELUARAN" ? "(bruto, sebelum dipotong pajak) " : ""}*</Label>
            <MoneyInput id="en-amount" value={f.amount} onChange={(d) => set({ amount: d })} invalid={Boolean(errors.amount)} describedBy={errors.amount ? "en-amount-err" : undefined} />
            <FieldError id="en-amount" message={errors.amount} />
          </div>

          {f.type === "PENGELUARAN" ? (
            <div className="space-y-4 rounded-lg border p-3">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="en-tax">Pajak dipotong (bila ada)</Label>
                  <MoneyInput id="en-tax" value={f.taxAmount} onChange={(d) => set({ taxAmount: d })} invalid={Boolean(errors.taxAmount)} describedBy={errors.taxAmount ? "en-tax-err" : undefined} />
                  <FieldError id="en-tax" message={errors.taxAmount} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="en-taxkind">Jenis pajak</Label>
                  <SearchSelect {...fieldA11y("en-taxkind", errors.taxKind)} className={SELECT_CLASS} value={f.taxKind} disabled={!f.taxAmount} onChange={(e) => set({ taxKind: e.target.value })}>
                    <option value="">Pilih jenis…</option>
                    {o.terms.taxKinds.map((k) => <option key={k} value={k}>{k}</option>)}
                  </SearchSelect>
                  <FieldError id="en-taxkind" message={errors.taxKind} />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Isi jumlah pajak sesuai ketentuan perpajakan yang berlaku; aplikasi tidak menghitung tarif. Pajak tertahan sampai dicatat sebagai setoran pajak.</p>
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" checked={f.bankFee} onChange={(e) => set({ bankFee: e.target.checked })} />
                Biaya administrasi bank (tampil di kolom Biaya Adm Buku Bank)
              </label>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>Batal</Button>
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
