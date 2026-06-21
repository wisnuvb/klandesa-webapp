"use client";

import Image from "next/image";
import { Building2, Copy, Loader2, Smartphone, Wallet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatIdr } from "@/lib/billing/catalog";
import type { LinkquEwalletRetailCode } from "@/lib/payment/linkqu-channels";
import { statusBadgeVariant } from "../_lib/statusBadgeVariant";
import type { CheckoutInvoice, VaBank } from "../_lib/types";
import { cn } from "@/components/ui/utils";

type EwalletChannel = {
  id: string;
  label: string;
  retailCode: LinkquEwalletRetailCode;
};

type ModuleAddonCheckoutDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleLabel: string;
  monthlyFee: number | null;
  checkoutStep: "method" | "payment";
  paymentMethod: "va" | "ewallet";
  setPaymentMethod: (method: "va" | "ewallet") => void;
  vaBanks: VaBank[];
  banksLoading: boolean;
  selectedBankCode: string;
  setSelectedBankCode: (code: string) => void;
  ewalletChannels: EwalletChannel[];
  selectedRetailCode: LinkquEwalletRetailCode;
  setSelectedRetailCode: (code: LinkquEwalletRetailCode) => void;
  ewalletPhone: string;
  setEwalletPhone: (phone: string) => void;
  checkoutLoading: boolean;
  checkoutError: string | null;
  checkoutNotice?: string | null;
  onConfirmCheckout: () => Promise<void>;
  activeInvoice: CheckoutInvoice | null;
  bankLabelForInvoice: string | null;
  copyText: (text: string) => Promise<void>;
  statusCheckLoading: boolean;
  refreshInvoiceStatus: (invoiceId: string) => Promise<void>;
};

export function ModuleAddonCheckoutDialog(props: ModuleAddonCheckoutDialogProps) {
  const {
    open,
    onOpenChange,
    moduleLabel,
    monthlyFee,
    checkoutStep,
    paymentMethod,
    setPaymentMethod,
    vaBanks,
    banksLoading,
    selectedBankCode,
    setSelectedBankCode,
    ewalletChannels,
    selectedRetailCode,
    setSelectedRetailCode,
    ewalletPhone,
    setEwalletPhone,
    checkoutLoading,
    checkoutError,
    checkoutNotice,
    onConfirmCheckout,
    activeInvoice,
    bankLabelForInvoice,
    copyText,
    statusCheckLoading,
    refreshInvoiceStatus,
  } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {checkoutStep === "payment" && activeInvoice
              ? "Pembayaran modul"
              : `Aktifkan ${moduleLabel || "modul"}`}
          </DialogTitle>
          <DialogDescription>
            {checkoutStep === "payment"
              ? "Selesaikan pembayaran melalui LinkQu Payment Gateway."
              : "Pilih metode pembayaran Virtual Account atau E-Wallet LinkQu."}
          </DialogDescription>
        </DialogHeader>

        {checkoutStep === "method" && monthlyFee != null && (
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
            <div className="text-muted-foreground">Langganan bulanan</div>
            <div className="text-lg font-semibold">{formatIdr(monthlyFee)}</div>
          </div>
        )}

        {checkoutStep === "method" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Metode pembayaran</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("va")}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border p-3 text-sm transition-colors",
                    paymentMethod === "va"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "hover:bg-muted/50",
                  )}
                >
                  <Building2 className="h-5 w-5" />
                  <span className="font-medium">Virtual Account</span>
                  <span className="text-xs text-muted-foreground text-center">
                    BCA, BNI, Mandiri, BRI, dll.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("ewallet")}
                  disabled={ewalletChannels.length === 0}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border p-3 text-sm transition-colors",
                    paymentMethod === "ewallet"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "hover:bg-muted/50",
                    ewalletChannels.length === 0 && "opacity-50 cursor-not-allowed",
                  )}
                >
                  <Smartphone className="h-5 w-5" />
                  <span className="font-medium">E-Wallet</span>
                  <span className="text-xs text-muted-foreground text-center">
                    DANA, LinkAja, ShopeePay
                  </span>
                </button>
              </div>
            </div>

            {paymentMethod === "va" && (
              <div className="space-y-2">
                <Label htmlFor="module-va-bank">Bank virtual account</Label>
                <Select
                  value={selectedBankCode}
                  onValueChange={setSelectedBankCode}
                  disabled={banksLoading || checkoutLoading}
                >
                  <SelectTrigger id="module-va-bank" className="w-full">
                    <SelectValue
                      placeholder={banksLoading ? "Memuat bank…" : "Pilih bank"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {vaBanks.map((b) => (
                      <SelectItem key={b.id} value={b.linkquBankCode}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {paymentMethod === "ewallet" && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="module-ewallet">E-Wallet</Label>
                  <Select
                    value={selectedRetailCode}
                    onValueChange={(v) =>
                      setSelectedRetailCode(v as LinkquEwalletRetailCode)
                    }
                    disabled={checkoutLoading}
                  >
                    <SelectTrigger id="module-ewallet" className="w-full">
                      <SelectValue placeholder="Pilih e-wallet" />
                    </SelectTrigger>
                    <SelectContent>
                      {ewalletChannels.map((c) => (
                        <SelectItem key={c.id} value={c.retailCode}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="module-ewallet-phone">Nomor HP terdaftar</Label>
                  <Input
                    id="module-ewallet-phone"
                    type="tel"
                    inputMode="tel"
                    placeholder="08xxxxxxxxxx"
                    value={ewalletPhone}
                    onChange={(e) => setEwalletPhone(e.target.value)}
                    disabled={checkoutLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Nomor harus terdaftar di aplikasi e-wallet yang dipilih.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
              <Wallet className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Pembayaran diproses aman melalui{" "}
                <strong>LinkQu Payment Gateway</strong>.
              </span>
            </div>

            {checkoutNotice && (
              <div className="text-sm text-muted-foreground">{checkoutNotice}</div>
            )}
            {checkoutError && (
              <div className="text-sm text-red-600">{checkoutError}</div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={checkoutLoading}
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={() => void onConfirmCheckout()}
                disabled={checkoutLoading || (paymentMethod === "va" && banksLoading)}
              >
                {checkoutLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memproses…
                  </>
                ) : paymentMethod === "va" ? (
                  "Buat virtual account"
                ) : (
                  "Bayar via e-wallet"
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {checkoutStep === "payment" && activeInvoice && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{activeInvoice.invoiceNumber}</span>
              <Badge variant={statusBadgeVariant(activeInvoice.status)}>
                {activeInvoice.status}
              </Badge>
            </div>

            {checkoutNotice && (
              <div className="text-sm text-muted-foreground">{checkoutNotice}</div>
            )}

            {activeInvoice.status.toLowerCase() === "paid" ? (
              <p className="text-sm text-green-700">
                Pembayaran diterima. Modul akan segera aktif.
              </p>
            ) : (
              <>
                {bankLabelForInvoice && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Bank: </span>
                    {bankLabelForInvoice}
                  </div>
                )}
                {activeInvoice.vaNumber && (
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">
                      Nomor virtual account
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="rounded bg-muted px-2 py-1 text-base font-mono">
                        {activeInvoice.vaNumber}
                      </code>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => void copyText(activeInvoice.vaNumber!)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Salin
                      </Button>
                    </div>
                  </div>
                )}
                <div className="text-sm">
                  <span className="text-muted-foreground">Nominal: </span>
                  <span className="font-semibold">
                    {formatIdr(activeInvoice.amount)}
                  </span>
                </div>
                {activeInvoice.expiresAt && (
                  <div className="text-xs text-muted-foreground">
                    Berlaku hingga:{" "}
                    {new Date(activeInvoice.expiresAt).toLocaleString("id-ID")}
                  </div>
                )}
                {activeInvoice.paymentUrl && (
                  <a
                    href={activeInvoice.paymentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-primary underline"
                  >
                    Buka halaman pembayaran e-wallet
                  </a>
                )}
                {activeInvoice.qrImageUrl && (
                  <div>
                    <Image
                      src={activeInvoice.qrImageUrl}
                      alt="QR pembayaran"
                      className="h-56 w-56 rounded-md border object-contain bg-white"
                      width={225}
                      height={225}
                    />
                  </div>
                )}
              </>
            )}

            {checkoutError && (
              <div className="text-sm text-red-600">{checkoutError}</div>
            )}

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => void refreshInvoiceStatus(activeInvoice.id)}
                disabled={statusCheckLoading}
              >
                {statusCheckLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memeriksa…
                  </>
                ) : (
                  "Cek status pembayaran"
                )}
              </Button>
              <Button type="button" onClick={() => onOpenChange(false)}>
                Tutup
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
