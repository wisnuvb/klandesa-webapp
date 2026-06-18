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
  pendingInvoice: BillingStatusResponse["invoices"][number] | null;
  lastInvoice: BillingStatusResponse["invoices"][number] | null;
  bankLabelForInvoice: string | null;
  statusCheckLoading: boolean;

  openCheckout: (tier: DesaPackageTier) => void;
  resumePendingInvoice: () => void;
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
    pendingInvoice,
    lastInvoice,
    bankLabelForInvoice,
    statusCheckLoading,
    openCheckout,
    resumePendingInvoice,
    copyText,
    refreshInvoiceStatus,
  } = props;

  const displayInvoice = activeInvoice ?? pendingInvoice;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pembelian Paket Desa</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingInvoice && !checkoutOpen && (
          <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
            <div className="text-sm font-medium">Invoice pending</div>
            <div className="text-sm text-muted-foreground">
              Selesaikan pembayaran invoice ini agar tidak terjadi tagihan ganda.
            </div>
            <Button type="button" size="sm" onClick={resumePendingInvoice}>
              Lanjutkan pembayaran
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(
            Object.keys(BILLING_CATALOG.desa_package.tiers) as DesaPackageTier[]
          ).map((tier) => (
            <TierCard
              key={tier}
              tier={tier}
              currentPlan={data?.subscription.plan ?? null}
              subscriptionPaid={data?.subscription.paid ?? false}
              subscriptionPhase={data?.subscription.phase ?? data?.subscription.status}
              onOpenCheckout={openCheckout}
              checkoutLoading={checkoutLoading || Boolean(pendingInvoice)}
            />
          ))}
        </div>

        {checkoutError && !checkoutOpen && (
          <div className="text-sm text-red-600">{checkoutError}</div>
        )}

        {displayInvoice && !checkoutOpen && (
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium">{displayInvoice.invoiceNumber}</div>
              <Badge variant={statusBadgeVariant(displayInvoice.status)}>
                {displayInvoice.status}
              </Badge>
              <div className="text-sm text-muted-foreground">
                Total: {formatIdr(displayInvoice.amount)}
              </div>
            </div>

            {displayInvoice.paymentMethod === "va" && displayInvoice.vaNumber && (
              <div className="text-sm space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground">
                    Bank: {bankLabelForInvoice ?? displayInvoice.bankCode ?? "-"}
                  </span>
                  <span className="text-muted-foreground">VA:</span>
                  <code className="rounded bg-muted px-2 py-0.5 font-mono">
                    {displayInvoice.vaNumber}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={() => void copyText(displayInvoice.vaNumber!)}
                  >
                    Salin VA
                  </Button>
                </div>
              </div>
            )}

            {displayInvoice.qrImageUrl && (
              <div>
                <Image
                  src={displayInvoice.qrImageUrl}
                  alt="QR pembayaran"
                  className="h-56 w-56 rounded-md border object-contain bg-white"
                  width={225}
                  height={225}
                />
              </div>
            )}
            {!displayInvoice.qrImageUrl && displayInvoice.qrContent && (
              <div className="text-sm break-all">{displayInvoice.qrContent}</div>
            )}
            {displayInvoice.paymentUrl && (
              <div className="text-sm">
                <a
                  href={displayInvoice.paymentUrl}
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
              onClick={() => void refreshInvoiceStatus(displayInvoice.id)}
            >
              {statusCheckLoading ? "Memeriksa…" : "Cek status pembayaran"}
            </Button>
          </div>
        )}

        {lastInvoice && !displayInvoice && (
          <div className="text-sm text-muted-foreground">
            Invoice terakhir: {lastInvoice.invoiceNumber} ({lastInvoice.status})
          </div>
        )}
      </CardContent>
    </Card>
  );
}
