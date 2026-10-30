"use client";

import { DesaPackagePurchaseCard } from "./_components/DesaPackagePurchaseCard";
import { ExtrasCard } from "./_components/ExtrasCard";
import { InvoiceHistoryCard } from "./_components/InvoiceHistoryCard";
import { ModuleCatalogCard } from "./_components/ModuleCatalogCard";
import { SubscriptionSummaryCard } from "./_components/SubscriptionSummaryCard";
import { useBillingStatus } from "./_hooks/useBillingStatus";
import { useDesaPackageCheckout } from "./_hooks/useDesaPackageCheckout";
import { useModuleAddonCheckout } from "./_hooks/useModuleAddonCheckout";

export default function Page() {
  const { loading, error, data, reload } = useBillingStatus();
  const desa = useDesaPackageCheckout({ data, reloadBilling: reload });
  const moduleCheckout = useModuleAddonCheckout({ data, reloadBilling: reload });

  return (
    <div className="space-y-6">
      <SubscriptionSummaryCard loading={loading} error={error} data={data} />

      <DesaPackagePurchaseCard
        data={data}
        pendingInvoice={desa.pendingDesaInvoice}
        lastInvoice={desa.lastInvoice}
        openCheckout={desa.openCheckout}
        resumePendingInvoice={desa.resumePendingInvoice}
      />

      <ExtrasCard
        plan={data?.subscription.plan}
        arsipAddon={data?.arsipAddon ?? null}
        onActivate={moduleCheckout.openCheckout}
        checkoutLoading={false}
      />

      {data?.modules && (
        <ModuleCatalogCard
          modules={data.modules}
          onActivate={moduleCheckout.openCheckout}
          checkoutLoading={null}
        />
      )}

      <InvoiceHistoryCard invoices={data?.invoices} />
    </div>
  );
}
