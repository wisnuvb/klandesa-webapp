"use client";

import Image from "next/image";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Loader2 } from "lucide-react";
import {
  BILLING_CATALOG,
  formatIdr,
  type DesaPackageTier,
} from "@/lib/billing/catalog";
import type { CheckoutInvoice, VaBank } from "../_lib/types";
import { statusBadgeVariant } from "../_lib/statusBadgeVariant";

type CheckoutDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  checkoutTier: DesaPackageTier | null;
  checkoutStep: "bank" | "payment";

  chargePreview: { totalAmount: number } | null;

  banksLoading: boolean;
  checkoutLoading: boolean;
  selectedBankCode: string;
  setSelectedBankCode: (code: string) => void;
  vaBanks: VaBank[];

  checkoutError: string | null;
  checkoutNotice?: string | null;
  onConfirmBank: () => Promise<void>;

  activeInvoice: CheckoutInvoice | null;
  bankLabelForInvoice: string | null;
  copyText: (text: string) => Promise<void>;
  statusCheckLoading: boolean;
  refreshInvoiceStatus: (invoiceId: string) => Promise<void>;
};

export function CheckoutDialog(props: CheckoutDialogProps) {
  const {
    open,
    onOpenChange,
    checkoutTier,
    checkoutStep,
    chargePreview,
    banksLoading,
    checkoutLoading,
    selectedBankCode,
    setSelectedBankCode,
    vaBanks,
    checkoutError,
    checkoutNotice,
    onConfirmBank,
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
            {checkoutTier
              ? `Pembayaran — ${BILLING_CATALOG.desa_package.tiers[checkoutTier].name}`
              : "Pembayaran"}
          </DialogTitle>
          <DialogDescription>
            Pembayaran memakai Virtual Account Linkqu. Pilih bank tujuan
            transfer, lalu transfer sesuai nominal dan nomor VA.
          </DialogDescription>
        </DialogHeader>

        {chargePreview && checkoutStep === "bank" && (
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
            <div className="text-muted-foreground">Total tagihan</div>
            <div className="text-lg font-semibold">
              {formatIdr(chargePreview.totalAmount)}
            </div>
          </div>
        )}

        {checkoutStep === "bank" && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="va-bank">Bank virtual account</Label>
              <Select
                value={selectedBankCode}
                onValueChange={setSelectedBankCode}
                disabled={banksLoading || checkoutLoading}
              >
                <SelectTrigger id="va-bank" className="w-full">
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
                onClick={onConfirmBank}
                disabled={checkoutLoading}
              >
                {checkoutLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memproses…
                  </>
                ) : (
                  "Buat virtual account"
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
                Pembayaran diterima. Langganan akan diperbarui.
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
                    Buka halaman pembayaran (jika ada)
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
                {!activeInvoice.qrImageUrl && activeInvoice.qrContent && (
                  <div className="text-sm break-all">
                    {activeInvoice.qrContent}
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
