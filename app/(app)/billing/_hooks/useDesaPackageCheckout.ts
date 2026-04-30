"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getDesaPackageCharge,
  type DesaPackageTier,
} from "@/lib/billing/catalog";
import type {
  BillingStatusResponse,
  CheckoutInvoice,
  CheckoutResponse,
  VaBank,
} from "../_lib/types";

type CheckoutStep = "bank" | "payment";

export function useDesaPackageCheckout(params: {
  data: BillingStatusResponse | null;
  reloadBilling: () => Promise<void>;
}) {
  const { data, reloadBilling } = params;

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [activeInvoice, setActiveInvoice] = useState<CheckoutInvoice | null>(
    null,
  );

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutTier, setCheckoutTier] = useState<DesaPackageTier | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("bank");
  const [vaBanks, setVaBanks] = useState<VaBank[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [selectedBankCode, setSelectedBankCode] = useState<string>("");
  const [statusCheckLoading, setStatusCheckLoading] = useState(false);

  useEffect(() => {
    if (!checkoutOpen) return;
    let cancelled = false;
    (async () => {
      setBanksLoading(true);
      try {
        const res = await fetch("/api/billing/va-banks");
        const j = (await res.json().catch(() => null)) as
          | { banks?: VaBank[]; error?: string }
          | null;
        if (!res.ok) {
          throw new Error(j?.error || "Gagal memuat daftar bank");
        }
        if (!cancelled) setVaBanks(j?.banks ?? []);
      } catch (e) {
        if (!cancelled) {
          setCheckoutError(
            e instanceof Error ? e.message : "Gagal memuat daftar bank",
          );
        }
      } finally {
        if (!cancelled) setBanksLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [checkoutOpen]);

  const chargePreview = useMemo(() => {
    if (!checkoutTier || !data) return null;
    return getDesaPackageCharge(checkoutTier, {
      subscriptionActive: data.subscription.active,
      currentPlan: data.subscription.plan,
    });
  }, [checkoutTier, data]);

  const openCheckout = useCallback((tier: DesaPackageTier) => {
    setCheckoutTier(tier);
    setCheckoutStep("bank");
    setSelectedBankCode("");
    setCheckoutError(null);
    setActiveInvoice(null);
    setCheckoutOpen(true);
  }, []);

  const createDesaCheckout = useCallback(
    async (tier: DesaPackageTier, bankCode: string) => {
      try {
        setCheckoutLoading(true);
        setCheckoutError(null);

        const res = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productType: "desa_package",
            planCode: tier,
            paymentMethod: "va",
            bankCode,
          }),
        });

        const j = (await res.json().catch(() => null)) as
          | CheckoutResponse
          | { error?: string }
          | null;
        if (!res.ok) {
          throw new Error(
            (j as { error?: string } | null)?.error || "Gagal membuat invoice",
          );
        }

        const invoice = (j as CheckoutResponse).invoice;
        setActiveInvoice(invoice);
        setCheckoutStep("payment");
        await reloadBilling();
      } catch (e) {
        setCheckoutError(e instanceof Error ? e.message : "Gagal membuat invoice");
      } finally {
        setCheckoutLoading(false);
      }
    },
    [reloadBilling],
  );

  const onConfirmBank = useCallback(async () => {
    if (!checkoutTier) return;
    if (!selectedBankCode) {
      setCheckoutError("Pilih bank untuk virtual account.");
      return;
    }
    await createDesaCheckout(checkoutTier, selectedBankCode);
  }, [checkoutTier, createDesaCheckout, selectedBankCode]);

  const refreshInvoiceStatus = useCallback(
    async (invoiceId: string) => {
      try {
        setStatusCheckLoading(true);
        setCheckoutError(null);
        const res = await fetch(`/api/billing/invoices/${invoiceId}`);
        const j = (await res.json().catch(() => null)) as
          | { invoice?: CheckoutInvoice; error?: string }
          | null;
        if (!res.ok) {
          throw new Error(j?.error || "Gagal memeriksa status");
        }
        if (j?.invoice) {
          setActiveInvoice(j.invoice);
          await reloadBilling();
        }
      } catch (e) {
        setCheckoutError(e instanceof Error ? e.message : "Gagal memeriksa status");
      } finally {
        setStatusCheckLoading(false);
      }
    },
    [reloadBilling],
  );

  const pollInvoiceId = activeInvoice?.id;
  const pollInvoiceStatus = activeInvoice?.status;

  useEffect(() => {
    if (!checkoutOpen || checkoutStep !== "payment" || !pollInvoiceId) return;
    if (pollInvoiceStatus?.toLowerCase() !== "pending") return;

    const t = window.setInterval(() => {
      void refreshInvoiceStatus(pollInvoiceId);
    }, 8000);

    return () => window.clearInterval(t);
  }, [checkoutOpen, checkoutStep, pollInvoiceId, pollInvoiceStatus, refreshInvoiceStatus]);

  const bankLabelForInvoice = useMemo(() => {
    if (!activeInvoice?.bankCode) return null;
    const b = vaBanks.find((x) => x.linkquBankCode === activeInvoice.bankCode);
    return b?.label ?? `Bank (kode ${activeInvoice.bankCode})`;
  }, [activeInvoice?.bankCode, vaBanks]);

  const lastInvoice = useMemo(() => data?.invoices?.[0] ?? null, [data]);

  const copyText = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setCheckoutError("Tidak bisa menyalin ke clipboard");
    }
  }, []);

  const setDialogOpen = useCallback((open: boolean) => {
    setCheckoutOpen(open);
    if (!open) {
      setCheckoutTier(null);
      setCheckoutStep("bank");
      setSelectedBankCode("");
    }
  }, []);

  return {
    checkoutLoading,
    checkoutError,
    setCheckoutError,
    activeInvoice,

    checkoutOpen,
    setDialogOpen,
    checkoutTier,
    checkoutStep,
    vaBanks,
    banksLoading,
    selectedBankCode,
    setSelectedBankCode,
    statusCheckLoading,

    chargePreview,
    openCheckout,
    onConfirmBank,
    refreshInvoiceStatus,
    bankLabelForInvoice,
    lastInvoice,
    copyText,
  };
}

