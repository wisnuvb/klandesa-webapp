import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatIdr,
  BILLING_CATALOG,
  type DesaPackageTier,
} from "@/lib/billing/catalog";
import type { BillingStatusResponse, CheckoutInvoice } from "../_lib/types";
import { TierCard } from "./TierCard";
import { statusBadgeVariant } from "../_lib/statusBadgeVariant";

type DesaPackagePurchaseCardProps = {
  data: BillingStatusResponse | null;
  checkoutLoading: boolean;
  checkoutError: string | null;
  checkoutOpen: boolean;

  activeInvoice: CheckoutInvoice | null;
  lastInvoice: BillingStatusResponse["invoices"][number] | null;
  bankLabelForInvoice: string | null;
  statusCheckLoading: boolean;

  openCheckout: (tier: DesaPackageTier) => void;
  copyText: (text: string) => Promise<void>;
  refreshInvoiceStatus: (invoiceId: string) => Promise<void>;
};

export function DesaPackagePurchaseCard(props: DesaPackagePurchaseCardProps) {
  const {
    data,
    checkoutLoading,
    checkoutError,
    checkoutOpen,
    activeInvoice,
    lastInvoice,
    bankLabelForInvoice,
    statusCheckLoading,
    openCheckout,
    copyText,
    refreshInvoiceStatus,
  } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pembelian Paket Desa</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(
            Object.keys(BILLING_CATALOG.desa_package.tiers) as DesaPackageTier[]
          ).map((tier) => (
            <TierCard
              key={tier}
              tier={tier}
              currentPlan={data?.subscription.plan ?? null}
              isActive={data?.subscription.active ?? false}
              onOpenCheckout={openCheckout}
              checkoutLoading={checkoutLoading}
            />
          ))}
        </div>

        {checkoutError && !checkoutOpen && (
          <div className="text-sm text-red-600">{checkoutError}</div>
        )}

        {activeInvoice && !checkoutOpen && (
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium">{activeInvoice.invoiceNumber}</div>
              <Badge variant={statusBadgeVariant(activeInvoice.status)}>
                {activeInvoice.status}
              </Badge>
              <div className="text-sm text-muted-foreground">
                Total: {formatIdr(activeInvoice.amount)}
              </div>
            </div>

            {activeInvoice.paymentMethod === "va" && activeInvoice.vaNumber && (
              <div className="text-sm space-y-1">
                {bankLabelForInvoice && (
                  <div>
                    <span className="text-muted-foreground">Bank: </span>
                    {bankLabelForInvoice}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground">VA:</span>
                  <code className="rounded bg-muted px-2 py-0.5 font-mono">
                    {activeInvoice.vaNumber}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={() => void copyText(activeInvoice.vaNumber!)}
                  >
                    Salin VA
                  </Button>
                </div>
              </div>
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
              <div className="text-sm break-all">{activeInvoice.qrContent}</div>
            )}
            {activeInvoice.paymentUrl && (
              <div className="text-sm">
                <a
                  href={activeInvoice.paymentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Buka link pembayaran
                </a>
              </div>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={statusCheckLoading}
              onClick={() => void refreshInvoiceStatus(activeInvoice.id)}
            >
              {statusCheckLoading ? "Memeriksa…" : "Cek status pembayaran"}
            </Button>
          </div>
        )}

        {lastInvoice && !activeInvoice && (
          <div className="text-sm text-muted-foreground">
            Invoice terakhir: {lastInvoice.invoiceNumber} ({lastInvoice.status})
          </div>
        )}
      </CardContent>
    </Card>
  );
}
