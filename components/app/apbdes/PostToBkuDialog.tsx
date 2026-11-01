"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { SELECT_CLASS, rupiah } from "@/components/app/perencanaan/shared";
import { useApiGet } from "@/hooks/useApiGet";
import { useFormSubmit } from "@/hooks/useFormSubmit";

interface Options {
  year: number;
  hasActiveDocument: boolean;
  options: { activityCode: string; activityName: string; accountCode: string; accountName: string; budget: string; spent: string; remaining: string; hasDanaDesa: boolean }[];
}

/**
 * Dialog bersama untuk mencatat pembayaran suatu modul (BLT, PKTD, KDMP) ke Buku Kas Umum: operator memilih kegiatan dan rekening
 * belanja dari APB Desa yang berlaku, kas tunai atau bank, dan nomor bukti. Aturan buku kas diperiksa server.
 */
export function PostToBkuDialog({ year, title, summary, amount, url, extraBody, defaultChannel, defaultActivityCode, defaultVoucher, onClose, onDone }: { year: number; title: string; summary: string; amount: string; url: string; extraBody?: Record<string, unknown>; defaultChannel: "TUNAI" | "BANK"; defaultActivityCode?: string | null; defaultVoucher: string; onClose: () => void; onDone: () => void }) {
  const { data, loading, error } = useApiGet<Options>(`/api/apbdes/opsi-belanja?year=${year}`);
  const [pair, setPair] = useState<string | null>(null);
  const [channel, setChannel] = useState<string>(defaultChannel);
  const [voucher, setVoucher] = useState(defaultVoucher);
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();

  const options = data?.options ?? [];
  const preferred = options.find((o) => defaultActivityCode && o.activityCode === defaultActivityCode) ?? options[0];
  const chosen = pair ?? (preferred ? `${preferred.activityCode}|${preferred.accountCode}` : "");
  const opt = options.find((o) => `${o.activityCode}|${o.accountCode}` === chosen);
  const over = opt ? Number(amount) > Number(opt.remaining) : false;

  async function go(e: React.FormEvent) {
    e.preventDefault();
    const [activityCode, accountCode] = chosen.split("|");
    if (await submit(url, "POST", { ...extraBody, activityCode, accountCode, channel, voucherNo: voucher })) onDone();
  }

  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="min-w-0 overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{summary}</DialogDescription>
        </DialogHeader>
        {loading ? (
          <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            Memuat pilihan belanja APB Desa…
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {data && !data.hasActiveDocument ? (
          <p role="alert" className="rounded-md border border-amber-600/50 bg-amber-50 p-3 text-sm text-amber-950">
            APB Desa {year} belum ditetapkan, sehingga belanja belum dapat dicatat ke Buku Kas Umum.{" "}
            <Link href="/apbdes" className="underline underline-offset-4">
              Buka APBDes
            </Link>
          </p>
        ) : null}
        {data && data.hasActiveDocument && !options.length ? <p className="text-sm text-muted-foreground">APB Desa {year} belum memuat belanja berkegiatan.</p> : null}
        {options.length ? (
          <form onSubmit={go} className="min-w-0 space-y-4" noValidate>
            <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ activityCode: "Kegiatan", accountCode: "Rekening", channel: "Kas", voucherNo: "Nomor bukti", paidOn: "Tanggal bayar" }} />
            <p className="rounded-md border bg-muted p-3 text-sm">
              Dicatat sebagai pengeluaran: <strong className="tabular-nums">{rupiah(amount)}</strong>
            </p>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="bku-pair">Kegiatan dan rekening belanja *</Label>
              <SearchSelect id="bku-pair" className={`${SELECT_CLASS} min-w-0 max-w-full`} value={chosen} onChange={(e) => setPair(e.target.value)} aria-describedby="bku-pair-h">
                {options.map((o) => (
                  <option key={`${o.activityCode}|${o.accountCode}`} value={`${o.activityCode}|${o.accountCode}`}>
                    {o.hasDanaDesa ? "[Dana Desa] " : ""}
                    {o.activityCode} {o.activityName} — {o.accountCode} {o.accountName}
                  </option>
                ))}
              </SearchSelect>
              {opt ? (
                <p id="bku-pair-h" className={`text-xs ${over ? "font-medium text-destructive" : "text-muted-foreground"}`}>
                  Anggaran {rupiah(opt.budget)}, terpakai {rupiah(opt.spent)}, sisa {rupiah(opt.remaining)}
                  {over ? ". Jumlah ini melebihi sisa anggaran dan akan ditolak." : "."}
                </p>
              ) : null}
            </div>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor="bku-channel">Dibayar dari *</Label>
                <SearchSelect id="bku-channel" className={SELECT_CLASS} value={channel} onChange={(e) => setChannel(e.target.value)}>
                  <option value="TUNAI">Kas tunai</option>
                  <option value="BANK">Rekening bank desa</option>
                </SearchSelect>
              </div>
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor="bku-voucher">Nomor bukti *</Label>
                <Input id="bku-voucher" className="h-11" maxLength={60} value={voucher} onChange={(e) => setVoucher(e.target.value)} aria-invalid={Boolean(errors.voucherNo)} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={busy}>
                Batal
              </Button>
              <Button type="submit" className="min-h-11" disabled={busy || !chosen}>
                {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
                Catat ke Buku Kas Umum
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
