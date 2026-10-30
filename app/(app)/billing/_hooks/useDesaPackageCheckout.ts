"use client";

import { useCallback, useMemo } from "react";
import { usePayment } from "@/components/billing/PaymentProvider";
import {
  BILLING_CATALOG,
  getDesaPackageCharge,
  type DesaPackageTier,
} from "@/lib/billing/catalog";
import type { BillingStatusResponse } from "../_lib/types";

function isUnexpired(expiresAt: string | null): boolean {
  return !expiresAt || new Date(expiresAt).getTime() > Date.now();
}

/** Pembelian paket desa: hanya menyusun permintaan; seluruh UI & alur LinkQu ada di PaymentProvider. */
export function useDesaPackageCheckout(params: {
  data: BillingStatusResponse | null;
  reloadBilling: () => Promise<void>;
}) {
  const { data, reloadBilling } = params;
  const { pay } = usePayment();

  const pendingDesaInvoice = useMemo(() => {
    return (
      (data?.invoices ?? []).find((x) => {
        if (String(x.productType ?? "").toLowerCase() !== "desa_package") return false;
        if (String(x.status ?? "").toLowerCase() !== "pending") return false;
        return isUnexpired(x.expiresAt);
      }) ?? null
    );
  }, [data?.invoices]);

  const lastInvoice = useMemo(
    () =>
      (data?.invoices ?? []).find((x) => String(x.productType ?? "").toLowerCase() === "desa_package") ?? null,
    [data?.invoices],
  );

  const resumePendingInvoice = useCallback(() => {
    if (!pendingDesaInvoice) return;
    pay({
      productType: "desa_package",
      planCode: pendingDesaInvoice.planCode,
      title: "Paket Desa",
      amount: pendingDesaInvoice.amount,
      resumeInvoiceId: pendingDesaInvoice.id,
      successMessage: "Pembayaran diterima. Langganan akan diperbarui.",
      onPaid: reloadBilling,
    });
  }, [pay, pendingDesaInvoice, reloadBilling]);

  const openCheckout = useCallback(
    (tier: DesaPackageTier, months?: number) => {
      if (pendingDesaInvoice) {
        resumePendingInvoice();
        return;
      }
      const charge = getDesaPackageCharge(tier, {
        subscriptionPaid: data?.subscription.paid ?? false,
        currentPlan: data?.subscription.plan ?? null,
        hasPurchasedLengkap: data?.subscription.hasPurchasedLengkap,
        months,
      });
      pay({
        productType: "desa_package",
        planCode: tier,
        title: `Paket Desa — ${BILLING_CATALOG.desa_package.tiers[tier].name}`,
        amount: charge.totalAmount,
        metadata: tier === "lengkap" && months ? { months } : undefined,
        successMessage: "Pembayaran diterima. Langganan akan diperbarui.",
        onPaid: reloadBilling,
      });
    },
    [data?.subscription, pay, pendingDesaInvoice, reloadBilling, resumePendingInvoice],
  );

  return { openCheckout, pendingDesaInvoice, resumePendingInvoice, lastInvoice };
}
