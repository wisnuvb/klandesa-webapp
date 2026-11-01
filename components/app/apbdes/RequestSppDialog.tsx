"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
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
  options: { activityCode: string; activityName: string; accountCode: string; accountName: string; budget: string; spent: string; remaining: string; hasDanaDesa: boolean; dpaApproved: boolean }[];
}

/**
 * Dialog bersama untuk mengajukan SPP dari modul pembayaran (BLT, PKTD, KDMP). Operator memilih kegiatan dan rekening belanja
 * dari APB Desa yang berlaku, jumlah (dibatasi kebutuhan yang belum didanai), dan penerima panjar (swakelola) atau penyedia (KDMP).
 * SPP lalu diverifikasi, disetujui, dan dibayar di menu APBDes; pembayaran modul baru dapat dicatat sesudahnya.
 */
export function RequestSppDialog({ kind, year, title, summary, url, fundable, extraBody, defaultActivityCode, onClose, onDone }: { kind: "BLT" | "PKTD" | "KDMP"; year: number; title: string; summary: string; url: string; fundable: string; extraBody?: Record<string, unknown>; defaultActivityCode?: string | null; onClose: () => void; onDone: () => void }) {
  const { data, loading, error } = useApiGet<Options>(`/api/apbdes/opsi-belanja?year=${year}`);
  const [pair, setPair] = useState<string | null>(null);
  const [amount, setAmount] = useState(String(Math.floor(Number(fundable))));
  const [executor, setExecutor] = useState("");
  const [payee, setPayee] = useState("");
  const [receipt, setReceipt] = useState(false);
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();

  const options = data?.options ?? [];
  const preferred = options.find((o) => defaultActivityCode && o.activityCode === defaultActivityCode) ?? options.find((o) => o.dpaApproved) ?? options[0];
  const chosen = pair ?? (preferred ? `${preferred.activityCode}|${preferred.accountCode}` : "");
  const opt = options.find((o) => `${o.activityCode}|${o.accountCode}` === chosen);
  const swakelola = kind !== "KDMP";

  async function go(e: React.FormEvent) {
    e.preventDefault();
    const [activityCode, accountCode] = chosen.split("|");
    if (await submit(url, "POST", { ...extraBody, activityCode, accountCode, amount, ...(swakelola ? { executorName: executor } : { payee, hasReceipt: receipt }) })) onDone();
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
            APB Desa {year} belum ditetapkan, sehingga SPP belum dapat diajukan.{" "}
            <Link href="/apbdes" className="underline underline-offset-4">
              Buka APBDes
            </Link>
          </p>
        ) : null}
        {data && data.hasActiveDocument && !options.length ? <p className="text-sm text-muted-foreground">APB Desa {year} belum memuat belanja berkegiatan.</p> : null}
        {options.length ? (
          <form onSubmit={go} className="min-w-0 space-y-4" noValidate>
            <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ activityCode: "Kegiatan", accountCode: "Rekening", amount: "Jumlah SPP", executorName: "Penerima panjar", payee: "Penerima pembayaran", hasReceipt: "Bukti terlampir", year: "Tahun" }} />
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="spp-pair">Kegiatan dan rekening belanja *</Label>
              <SearchSelect id="spp-pair" className={`${SELECT_CLASS} min-w-0 max-w-full`} value={chosen} onChange={(e) => setPair(e.target.value)} aria-describedby="spp-pair-h">
                {options.map((o) => (
                  <option key={`${o.activityCode}|${o.accountCode}`} value={`${o.activityCode}|${o.accountCode}`}>
                    {o.hasDanaDesa ? "[Dana Desa] " : ""}
                    {o.activityCode} {o.activityName} — {o.accountCode} {o.accountName}
                  </option>
                ))}
              </SearchSelect>
              {opt ? (
                <p id="spp-pair-h" className="text-xs text-muted-foreground">
                  Anggaran {rupiah(opt.budget)}, terpakai {rupiah(opt.spent)}, sisa {rupiah(opt.remaining)}.
                </p>
              ) : null}
              {opt && !opt.dpaApproved ? (
                <p role="alert" className="rounded-md border border-amber-600/50 bg-amber-50 p-2 text-xs text-amber-950">
                  DPA kegiatan ini belum disetujui Kepala Desa; SPP akan ditolak sampai DPA disetujui (Permendagri 20/2018 Pasal 52).{" "}
                  <Link href="/apbdes" className="underline underline-offset-4">
                    Buka DPA
                  </Link>
                </p>
              ) : null}
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="spp-amount">Jumlah SPP *</Label>
              <CurrencyInput id="spp-amount" inputClassName="h-11" value={amount} onValueChange={setAmount} aria-invalid={Boolean(errors.amount)} aria-describedby="spp-amount-h" />
              <p id="spp-amount-h" className="text-xs text-muted-foreground">
                Paling banyak {rupiah(fundable)}, yaitu kebutuhan pembayaran yang belum didanai SPP mana pun.
              </p>
            </div>
            {swakelola ? (
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor="spp-exec">Kaur/Kasi penerima panjar *</Label>
                <Input id="spp-exec" className="h-11" maxLength={150} value={executor} onChange={(e) => setExecutor(e.target.value)} aria-invalid={Boolean(errors.executorName)} aria-describedby="spp-exec-h" />
                <p id="spp-exec-h" className="text-xs text-muted-foreground">
                  Dana dibayarkan kepada pelaksana sebagai panjar dan dipertanggungjawabkan paling lambat 10 hari kerja. Pembayaran yang Anda catat di sini otomatis menjadi pertanggungjawabannya.
                </p>
              </div>
            ) : (
              <>
                <div className="min-w-0 space-y-1.5">
                  <Label htmlFor="spp-payee">Dibayarkan kepada (penyedia) *</Label>
                  <Input id="spp-payee" className="h-11" maxLength={150} value={payee} onChange={(e) => setPayee(e.target.value)} aria-invalid={Boolean(errors.payee)} />
                </div>
                <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" className="size-5 shrink-0" checked={receipt} onChange={(e) => setReceipt(e.target.checked)} aria-invalid={Boolean(errors.hasReceipt)} />
                  Bukti penerimaan barang/jasa dan pernyataan tanggung jawab belanja sudah dilampirkan *
                </label>
              </>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={busy}>
                Batal
              </Button>
              <Button type="submit" className="min-h-11" disabled={busy || !chosen}>
                {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
                Ajukan SPP
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
