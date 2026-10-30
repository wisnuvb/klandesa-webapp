"use client";

import type { ReactNode } from "react";
import {
  Building2,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  Loader2,
  QrCode,
  Smartphone,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { linkquBankLabel } from "@/lib/payment/linkqu-channels";
import { formatIdr } from "@/lib/billing/catalog";
import { DURATION_DISCOUNT_PERCENT, durationLabel, priceForMonths } from "@/lib/billing/duration";
import { cn } from "@/components/ui/utils";
import type { PaymentFlow } from "./usePaymentFlow";
import type { PaymentMethod } from "./types";

const dateTimeFmt = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });

const METHOD_META: Record<PaymentMethod, { label: string; hint: string; icon: ReactNode }> = {
  qris: { label: "QRIS", hint: "Semua bank & e-wallet", icon: <QrCode className="size-5" aria-hidden="true" /> },
  va: { label: "Virtual Account", hint: "Transfer bank", icon: <Building2 className="size-5" aria-hidden="true" /> },
  ewallet: {
    label: "E-Wallet",
    hint: "DANA, LinkAja, ShopeePay",
    icon: <Smartphone className="size-5" aria-hidden="true" />,
  },
};

/**
 * Satu-satunya UI pembayaran aplikasi. Diubah di sini = berubah di semua halaman yang memanggil `usePayment().pay()`.
 * Jangan membuat dialog pembayaran sendiri di halaman; panggil `pay()`.
 */
export function PaymentDialog({ flow }: { flow: PaymentFlow & { dismiss?: () => void } }) {
  const {
    open,
    request,
    methods,
    close,
    restart,
    method,
    setMethod,
    banks,
    options,
    optionsLoading,
    anyMethodAvailable,
    total,
    bankCode,
    setBankCode,
    ewalletChannels,
    retailCode,
    setRetailCode,
    phone,
    setPhone,
    months,
    setMonths,
    fieldError,
    error,
    notice,
    creating,
    submit,
    invoice,
    checking,
    refresh,
    copy,
  } = flow;

  const durations = request?.durations?.length ? request.durations : null;
  const status = invoice?.status?.toLowerCase();
  const paid = status === "paid";
  const closedUnpaid = status === "expired" || status === "failed";
  const bankLabel = invoice?.bankCode ? (linkquBankLabel(invoice.bankCode) ?? `Kode bank ${invoice.bankCode}`) : null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{paid ? "Pembayaran berhasil" : "Pembayaran"}</DialogTitle>
          <DialogDescription>
            {paid
              ? (request?.successMessage ?? `${request?.title ?? "Pesanan Anda"} sudah aktif.`)
              : invoice
                ? "Selesaikan pembayaran sesuai instruksi di bawah."
                : "Pilih metode pembayaran. Diproses aman oleh LinkQu."}
          </DialogDescription>
        </DialogHeader>

        {paid && invoice ? (
          <div className="space-y-4 text-center" role="status">
            <CheckCircle2 className="mx-auto size-14 text-green-600" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              Invoice <span className="font-mono">{invoice.invoiceNumber}</span> · {formatIdr(invoice.amount)}
            </p>
            <Button type="button" className="w-full" onClick={close}>
              Selesai
            </Button>
          </div>
        ) : invoice ? (
          <div className="space-y-4">
            <div className="space-y-2 rounded-md border bg-muted/40 p-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Invoice</span>
                <span className="break-all text-right font-mono font-medium">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-bold tabular-nums">{formatIdr(invoice.amount)}</span>
              </div>
              {invoice.expiresAt && (
                <p className="text-xs text-muted-foreground">
                  Bayar sebelum {dateTimeFmt.format(new Date(invoice.expiresAt))}
                </p>
              )}
            </div>

            {invoice.qrImageUrl && (
              <div className="flex flex-col items-center gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={invoice.qrImageUrl}
                  alt="Kode QRIS untuk membayar tagihan"
                  className="size-52 rounded-md border bg-white object-contain"
                />
                <p className="text-xs text-muted-foreground">Scan dengan aplikasi bank atau e-wallet apa pun.</p>
              </div>
            )}
            {!invoice.qrImageUrl && invoice.qrContent && (
              <p className="break-all rounded-md border p-2 text-xs">{invoice.qrContent}</p>
            )}

            {invoice.vaNumber && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
                <p className="mb-1 font-medium text-amber-900">Virtual Account{bankLabel ? ` ${bankLabel}` : ""}</p>
                <div className="flex items-center justify-between gap-2">
                  <code className="break-all text-lg tracking-wider">{invoice.vaNumber}</code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Salin nomor virtual account"
                    onClick={() => void copy(invoice.vaNumber!)}
                  >
                    <Copy className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            )}

            {invoice.paymentUrl && (
              <Button asChild className="w-full">
                <a href={invoice.paymentUrl} target="_blank" rel="noopener noreferrer">
                  Buka halaman bayar
                  <ExternalLink className="size-4" aria-hidden="true" />
                </a>
              </Button>
            )}

            {closedUnpaid ? (
              <div role="alert" className="space-y-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <p>Tagihan ini {status === "expired" ? "sudah kedaluwarsa" : "gagal"}. Buat tagihan baru untuk melanjutkan.</p>
                <Button type="button" variant="outline" className="w-full" onClick={restart}>
                  Buat tagihan baru
                </Button>
              </div>
            ) : (
              <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status" aria-live="polite">
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                Menunggu pembayaran. Layar ini berubah otomatis setelah pembayaran diterima.
              </p>
            )}

            {notice && <p className="text-xs text-muted-foreground">{notice}</p>}
            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}
            {!closedUnpaid && (
              <p className="text-xs text-muted-foreground">
                Tidak sengaja menutup layar ini? Nomor VA atau kode QR tetap tersimpan di{" "}
                <Link href="/billing/riwayat" onClick={flow.dismiss ?? close} className="font-medium text-primary underline underline-offset-2">
                  Riwayat Pembayaran
                </Link>
                .
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>
                Tutup
              </Button>
              {!closedUnpaid && (
                <Button type="button" disabled={checking} onClick={() => void refresh(invoice.id)}>
                  {checking ? "Memeriksa…" : "Cek status"}
                </Button>
              )}
            </DialogFooter>
          </div>
        ) : (
          <form
            className="space-y-5"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            {request?.resumeInvoiceId && !error ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                Memuat tagihan…
              </p>
            ) : (
              <>
                <div className="space-y-2 rounded-md border bg-muted/40 p-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Item</span>
                    <span className="text-right font-medium">{request?.title}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold">Total</span>
                    <span className="text-lg font-bold tabular-nums">{request ? formatIdr(total) : ""}</span>
                  </div>
                  {durations && (
                    <p className="text-xs text-muted-foreground">
                      Berlaku {months} bulan sejak pembayaran. Jika masih aktif, perpanjangan menyambung dari tanggal berakhir.
                    </p>
                  )}
                  {request?.note && <p className="text-xs text-muted-foreground">{request.note}</p>}
                </div>

                {durations && (
                  <fieldset className="space-y-2">
                    <legend className="mb-2 text-sm font-semibold">Lama langganan</legend>
                    <RadioGroup
                      className="grid grid-cols-2 gap-2"
                      value={String(months)}
                      onValueChange={(v) => setMonths(Number(v) as typeof months)}
                    >
                      {durations.map((d) => {
                        const discount = DURATION_DISCOUNT_PERCENT[d] ?? 0;
                        return (
                          <label
                            key={d}
                            htmlFor={`pay-duration-${d}`}
                            className={cn(
                              "flex min-h-14 cursor-pointer items-start gap-2 rounded-md border-2 p-3 transition-colors",
                              months === d ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                            )}
                          >
                            <RadioGroupItem id={`pay-duration-${d}`} value={String(d)} className="mt-0.5" />
                            <span className="min-w-0">
                              <span className="block text-sm font-medium">{durationLabel(d)}</span>
                              <span className="block text-xs tabular-nums text-muted-foreground">
                                {formatIdr(priceForMonths(request!.amount, d))}
                                {discount > 0 && ` · hemat ${discount}%`}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </RadioGroup>
                  </fieldset>
                )}

                <fieldset className="space-y-2">
                  <legend className="mb-2 text-sm font-semibold">Metode pembayaran</legend>
                  <RadioGroup value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                    {methods.map((m) => {
                      const avail = options?.methods[m];
                      const disabled = avail ? !avail.available : false;
                      return (
                        <label
                          key={m}
                          htmlFor={`pay-method-${m}`}
                          className={cn(
                            "flex min-h-12 items-center gap-3 rounded-md border-2 p-3 transition-colors",
                            disabled ? "cursor-not-allowed border-border bg-muted/40 opacity-60" : "cursor-pointer",
                            !disabled && (method === m ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"),
                          )}
                        >
                          <RadioGroupItem id={`pay-method-${m}`} value={m} disabled={disabled} />
                          <span className="text-muted-foreground">{METHOD_META[m].icon}</span>
                          <span className="font-medium">{METHOD_META[m].label}</span>
                          <span className="ml-auto text-right text-xs text-muted-foreground">
                            {disabled ? avail?.reason : METHOD_META[m].hint}
                          </span>
                        </label>
                      );
                    })}
                  </RadioGroup>
                </fieldset>

                {method === "va" && (
                  <div className="space-y-2">
                    <Label htmlFor="pay-bank">Bank virtual account</Label>
                    <Select value={bankCode} onValueChange={setBankCode} disabled={optionsLoading || creating}>
                      <SelectTrigger id="pay-bank" className="w-full">
                        <SelectValue placeholder={optionsLoading ? "Memuat bank…" : "Pilih bank"} />
                      </SelectTrigger>
                      <SelectContent>
                        {banks.map((b) => (
                          <SelectItem key={b.id} value={b.linkquBankCode} disabled={!b.available}>
                            {b.label}
                            {!b.available && b.reason ? ` — ${b.reason}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {method === "ewallet" && (
                  <div className="space-y-3">
                    <fieldset>
                      <legend className="mb-2 text-sm font-semibold">E-wallet</legend>
                      <RadioGroup
                        className="flex flex-wrap gap-2"
                        value={retailCode}
                        onValueChange={(v) => setRetailCode(v as typeof retailCode)}
                      >
                        {ewalletChannels.map((c) => (
                          <label
                            key={c.id}
                            htmlFor={`pay-ew-${c.id}`}
                            className={cn(
                              "flex min-h-11 items-center gap-2 rounded-md border-2 px-3 py-1 text-sm font-medium transition-colors",
                              !c.available
                                ? "cursor-not-allowed border-border bg-muted/40 opacity-60"
                                : retailCode === c.retailCode
                                  ? "cursor-pointer border-primary bg-primary/5"
                                  : "cursor-pointer border-border hover:border-primary/50",
                            )}
                          >
                            <RadioGroupItem id={`pay-ew-${c.id}`} value={c.retailCode} disabled={!c.available} />
                            <span className="flex flex-col leading-tight">
                              {c.label}
                              {!c.available && c.reason && (
                                <span className="text-xs font-normal text-muted-foreground">{c.reason}</span>
                              )}
                            </span>
                          </label>
                        ))}
                      </RadioGroup>
                    </fieldset>
                    <div className="space-y-1">
                      <Label htmlFor="pay-phone">Nomor HP e-wallet</Label>
                      <Input
                        id="pay-phone"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel"
                        placeholder="08xxxxxxxxxx"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        aria-invalid={fieldError ? true : undefined}
                        aria-describedby={fieldError ? "pay-field-error" : "pay-phone-hint"}
                        className="h-11"
                      />
                      <p id="pay-phone-hint" className="text-xs text-muted-foreground">
                        Nomor yang terdaftar di aplikasi e-wallet pembayar.
                      </p>
                    </div>
                  </div>
                )}

                {optionsLoading && !options && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    Memeriksa metode pembayaran yang tersedia…
                  </p>
                )}
                {options && !anyMethodAvailable && (
                  <p role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    Semua metode pembayaran sedang tidak tersedia untuk nominal ini. Coba lagi beberapa saat lagi atau hubungi
                    tim Klandesa.
                  </p>
                )}

                {fieldError && (
                  <p id="pay-field-error" role="alert" className="text-sm text-red-700">
                    {fieldError}
                  </p>
                )}
              </>
            )}

            {error && (
              <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={close} disabled={creating}>
                Batal
              </Button>
              <Button
                type="submit"
                // Tanpa daftar opsi (sedang memuat) tombol menunggu; bila pemuatan gagal, server tetap memeriksa saat checkout.
                disabled={
                  creating ||
                  (!options && !error) ||
                  (options != null && !anyMethodAvailable) ||
                  Boolean(request?.resumeInvoiceId && !error)
                }
              >
                {creating ? (
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <CreditCard className="size-4" aria-hidden="true" />
                )}
                {creating ? "Memproses…" : "Bayar sekarang"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
