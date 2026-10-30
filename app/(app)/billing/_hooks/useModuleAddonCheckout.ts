"use client";

import { useCallback } from "react";
import { SUBSCRIPTION_DURATIONS } from "@/lib/billing/duration";
import { usePayment } from "@/components/billing/PaymentProvider";
import type { BillingStatusResponse } from "../_lib/types";

export type ModuleActivatePayload = {
  moduleId: string;
  planCode: string;
  label: string;
  monthlyFee: number;
  /** Default "module_addon". "arsip" = kapasitas arsip berlangganan bulanan. */
  productType?: "module_addon" | "arsip";
};

/** Add-on modul / arsip: hanya menyusun permintaan; seluruh UI & alur LinkQu ada di PaymentProvider. */
export function useModuleAddonCheckout(params: {
  data: BillingStatusResponse | null;
  reloadBilling: () => Promise<void>;
}) {
  const { data, reloadBilling } = params;
  const { pay } = usePayment();

  const openCheckout = useCallback(
    (payload: ModuleActivatePayload) => {
      const productType = payload.productType ?? "module_addon";
      const pending = (data?.invoices ?? []).find((x) => {
        if (String(x.productType ?? "").toLowerCase() !== productType) return false;
        if (String(x.planCode ?? "") !== payload.planCode) return false;
        if (String(x.status ?? "").toLowerCase() !== "pending") return false;
        return !x.expiresAt || new Date(x.expiresAt).getTime() > Date.now();
      });

      pay({
        productType,
        planCode: payload.planCode,
        title: productType === "arsip" ? payload.label : `Modul ${payload.label}`,
        amount: payload.monthlyFee,
        durations: SUBSCRIPTION_DURATIONS,
        resumeInvoiceId: pending?.id,
        successMessage: "Pembayaran diterima. Add-on akan aktif sebentar lagi.",
        onPaid: reloadBilling,
      });
    },
    [data?.invoices, pay, reloadBilling],
  );

  return { openCheckout };
}
