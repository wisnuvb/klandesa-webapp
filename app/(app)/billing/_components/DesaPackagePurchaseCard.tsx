import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BILLING_CATALOG,
  type DesaPackageTier,
} from "@/lib/billing/catalog";
import { visibleDesaTiers } from "@/lib/billing/lengkap";
import type { BillingStatusResponse } from "../_lib/types";
import { TierCard } from "./TierCard";

type DesaPackagePurchaseCardProps = {
  data: BillingStatusResponse | null;
  pendingInvoice: BillingStatusResponse["invoices"][number] | null;
  lastInvoice: BillingStatusResponse["invoices"][number] | null;
  openCheckout: (tier: DesaPackageTier, months?: number) => void;
  resumePendingInvoice: () => void;
};

export function DesaPackagePurchaseCard(props: DesaPackagePurchaseCardProps) {
  const { data, pendingInvoice, lastInvoice, openCheckout, resumePendingInvoice } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pembelian Paket Desa</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingInvoice && (
          <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
            <div className="text-sm font-medium">Invoice pending</div>
            <div className="text-sm text-muted-foreground">
              Selesaikan pembayaran invoice ini agar tidak terjadi tagihan ganda.
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={resumePendingInvoice}>
                Lanjutkan pembayaran
              </Button>
              <Button asChild type="button" size="sm" variant="outline">
                <Link href="/billing/riwayat">Riwayat pembayaran</Link>
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(
            Object.keys(BILLING_CATALOG.desa_package.tiers) as DesaPackageTier[]
          )
            // Desa baru hanya melihat Paket Lengkap; desa lama yang masih berbayar hanya melihat paketnya sendiri.
            .filter((tier) =>
              visibleDesaTiers({ plan: data?.subscription.plan, paid: data?.subscription.paid ?? false }).includes(tier),
            )
            .map((tier) => (
            <TierCard
              key={tier}
              tier={tier}
              currentPlan={data?.subscription.plan ?? null}
              subscriptionPaid={data?.subscription.paid ?? false}
              subscriptionPhase={data?.subscription.phase ?? data?.subscription.status}
              hasPurchasedLengkap={data?.subscription.hasPurchasedLengkap}
              onOpenCheckout={openCheckout}
              checkoutLoading={Boolean(pendingInvoice)}
            />
          ))}
        </div>

        {lastInvoice && !pendingInvoice && (
          <div className="text-sm text-muted-foreground">
            Invoice terakhir: {lastInvoice.invoiceNumber} ({lastInvoice.status})
          </div>
        )}
      </CardContent>
    </Card>
  );
}
