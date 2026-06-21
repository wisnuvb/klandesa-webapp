"use client";

import { CheckoutDialog } from "./_components/CheckoutDialog";
import { DesaPackagePurchaseCard } from "./_components/DesaPackagePurchaseCard";
import { InvoiceHistoryCard } from "./_components/InvoiceHistoryCard";
import { ModuleAddonCheckoutDialog } from "./_components/ModuleAddonCheckoutDialog";
import { ModuleCatalogCard } from "./_components/ModuleCatalogCard";
import { SubscriptionSummaryCard } from "./_components/SubscriptionSummaryCard";
import { useBillingStatus } from "./_hooks/useBillingStatus";
import { useDesaPackageCheckout } from "./_hooks/useDesaPackageCheckout";
import { useModuleAddonCheckout } from "./_hooks/useModuleAddonCheckout";

export default function Page() {
  const { loading, error, data, reload } = useBillingStatus();
  const checkout = useDesaPackageCheckout({ data, reloadBilling: reload });
  const moduleCheckout = useModuleAddonCheckout({ data, reloadBilling: reload });

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

      <ModuleAddonCheckoutDialog
        open={moduleCheckout.open}
        onOpenChange={moduleCheckout.setDialogOpen}
        moduleLabel={moduleCheckout.moduleLabel}
        monthlyFee={moduleCheckout.monthlyFee}
        checkoutStep={moduleCheckout.checkoutStep}
        paymentMethod={moduleCheckout.paymentMethod}
        setPaymentMethod={moduleCheckout.setPaymentMethod}
        vaBanks={moduleCheckout.vaBanks}
        banksLoading={moduleCheckout.banksLoading}
        selectedBankCode={moduleCheckout.selectedBankCode}
        setSelectedBankCode={moduleCheckout.setSelectedBankCode}
        ewalletChannels={moduleCheckout.ewalletChannels}
        selectedRetailCode={moduleCheckout.selectedRetailCode}
        setSelectedRetailCode={moduleCheckout.setSelectedRetailCode}
        ewalletPhone={moduleCheckout.ewalletPhone}
        setEwalletPhone={moduleCheckout.setEwalletPhone}
        checkoutLoading={moduleCheckout.checkoutLoading}
        checkoutError={moduleCheckout.checkoutError}
        checkoutNotice={moduleCheckout.checkoutNotice}
        onConfirmCheckout={moduleCheckout.onConfirmCheckout}
        activeInvoice={moduleCheckout.activeInvoice}
        bankLabelForInvoice={moduleCheckout.bankLabelForInvoice}
        copyText={moduleCheckout.copyText}
        statusCheckLoading={moduleCheckout.statusCheckLoading}
        refreshInvoiceStatus={moduleCheckout.refreshInvoiceStatus}
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

      {data?.modules && (
        <ModuleCatalogCard
          modules={data.modules}
          onActivate={moduleCheckout.openCheckout}
          checkoutLoading={
            moduleCheckout.checkoutLoading ? moduleCheckout.moduleId : null
          }
        />
      )}

      <InvoiceHistoryCard invoices={data?.invoices} />
    </div>
  );
}
