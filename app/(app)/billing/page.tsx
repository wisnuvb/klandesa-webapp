"use client";

import { CheckoutDialog } from "./_components/CheckoutDialog";
import { DesaPackagePurchaseCard } from "./_components/DesaPackagePurchaseCard";
import { InvoiceHistoryCard } from "./_components/InvoiceHistoryCard";
import { SubscriptionSummaryCard } from "./_components/SubscriptionSummaryCard";
import { useBillingStatus } from "./_hooks/useBillingStatus";
import { useDesaPackageCheckout } from "./_hooks/useDesaPackageCheckout";

export default function Page() {
  const { loading, error, data, reload } = useBillingStatus();
  const checkout = useDesaPackageCheckout({ data, reloadBilling: reload });

  return (
    <div className="space-y-6">
      <CheckoutDialog
        open={checkout.checkoutOpen}
        onOpenChange={checkout.setDialogOpen}
        checkoutTier={checkout.checkoutTier}
        checkoutStep={checkout.checkoutStep}
        chargePreview={checkout.chargePreview}
        banksLoading={checkout.banksLoading}
        checkoutLoading={checkout.checkoutLoading}
        selectedBankCode={checkout.selectedBankCode}
        setSelectedBankCode={checkout.setSelectedBankCode}
        vaBanks={checkout.vaBanks}
        checkoutError={checkout.checkoutError}
        checkoutNotice={checkout.checkoutNotice}
        onConfirmBank={checkout.onConfirmBank}
        activeInvoice={checkout.activeInvoice}
        bankLabelForInvoice={checkout.bankLabelForInvoice}
        copyText={checkout.copyText}
        statusCheckLoading={checkout.statusCheckLoading}
        refreshInvoiceStatus={checkout.refreshInvoiceStatus}
      />

      <SubscriptionSummaryCard loading={loading} error={error} data={data} />

      <DesaPackagePurchaseCard
        data={data}
        checkoutLoading={checkout.checkoutLoading}
        checkoutError={checkout.checkoutError}
        checkoutOpen={checkout.checkoutOpen}
        activeInvoice={checkout.activeInvoice}
        pendingInvoice={checkout.pendingDesaInvoice}
        lastInvoice={checkout.lastInvoice}
        bankLabelForInvoice={checkout.bankLabelForInvoice}
        statusCheckLoading={checkout.statusCheckLoading}
        openCheckout={checkout.openCheckout}
        resumePendingInvoice={() => {
          if (checkout.pendingDesaInvoice) {
            checkout.resumePendingInvoice(checkout.pendingDesaInvoice);
          }
        }}
        copyText={checkout.copyText}
        refreshInvoiceStatus={checkout.refreshInvoiceStatus}
      />

      <InvoiceHistoryCard invoices={data?.invoices} />
    </div>
  );
}
