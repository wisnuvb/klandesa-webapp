"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getDesaPackageCharge,
  type DesaPackageTier,
} from "@/lib/billing/catalog";
import type {
  BillingStatusResponse,
  BillingStatusInvoice,
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
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const [activeInvoice, setActiveInvoice] = useState<CheckoutInvoice | null>(
    null,
  );

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutTier, setCheckoutTier] = useState<DesaPackageTier | null>(
    null,
  );
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("bank");
  const [vaBanks, setVaBanks] = useState<VaBank[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [selectedBankCode, setSelectedBankCode] = useState<string>("");
  const [statusCheckLoading, setStatusCheckLoading] = useState(false);

  const pendingDesaInvoice = useMemo(() => {
    const inv = (data?.invoices ?? []).find((x) => {
      if (String(x.productType ?? "").toLowerCase() !== "desa_package")
        return false;
      if (String(x.status ?? "").toLowerCase() !== "pending") return false;
      if (!x.expiresAt) return true;
      return new Date(x.expiresAt).getTime() > Date.now();
    });
    return inv ?? null;
  }, [data?.invoices]);

  useEffect(() => {
    if (!checkoutOpen || checkoutStep !== "bank") return;
    let cancelled = false;
    (async () => {
      setBanksLoading(true);
      try {
        const res = await fetch("/api/billing/va-banks");
        const j = (await res.json().catch(() => null)) as {
          banks?: VaBank[];
          error?: string;
        } | null;
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
  }, [checkoutOpen, checkoutStep]);

  const chargePreview = useMemo(() => {
    if (!checkoutTier || !data) return null;
    return getDesaPackageCharge(checkoutTier, {
      subscriptionPaid: data.subscription.paid ?? false,
      currentPlan: data.subscription.plan,
    });
  }, [checkoutTier, data]);

  const resumePendingInvoice = useCallback((inv: BillingStatusInvoice) => {
    const maybeTier = String(inv.planCode ?? "").toLowerCase();
    const tier =
      maybeTier === "starter" ||
      maybeTier === "profesional" ||
      maybeTier === "enterprise"
        ? (maybeTier as DesaPackageTier)
        : null;

    setCheckoutTier(tier);
    setCheckoutStep("payment");
    setSelectedBankCode("");
    setCheckoutError(null);
    setCheckoutNotice(
      "Masih ada invoice pending. Selesaikan pembayaran untuk melanjutkan.",
    );
    setActiveInvoice({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      productType: inv.productType,
      planCode: inv.planCode,
      amount: inv.amount,
      status: inv.status,
      expiresAt: inv.expiresAt,
      paymentMethod: inv.paymentMethod,
      paymentUrl: inv.paymentUrl,
      qrContent: inv.qrContent,
      qrImageUrl: inv.qrImageUrl,
      vaNumber: inv.vaNumber,
      bankCode: inv.bankCode,
      createdAt: inv.createdAt,
      items: [],
    });
    setCheckoutOpen(true);
  }, []);

  const openCheckout = useCallback(
    (tier: DesaPackageTier) => {
      if (pendingDesaInvoice) {
        resumePendingInvoice(pendingDesaInvoice);
        return;
      }

      setCheckoutTier(tier);
      setCheckoutStep("bank");
      setSelectedBankCode("");
      setCheckoutError(null);
      setCheckoutNotice(null);
      setActiveInvoice(null);
      setCheckoutOpen(true);
    },
    [pendingDesaInvoice, resumePendingInvoice],
  );

  const createDesaCheckout = useCallback(
    async (tier: DesaPackageTier, bankCode: string) => {
      try {
        setCheckoutLoading(true);
        setCheckoutError(null);
        setCheckoutNotice(null);

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

        const ok = j as CheckoutResponse;
        const invoice = ok.invoice;
        setActiveInvoice(invoice);
        setCheckoutStep("payment");
        if (ok.reused) {
          setCheckoutNotice(
            "Invoice pending ditemukan. Gunakan invoice ini agar tidak terjadi tagihan ganda.",
          );
        }
        await reloadBilling();
      } catch (e) {
        setCheckoutError(
          e instanceof Error ? e.message : "Gagal membuat invoice",
        );
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
        setCheckoutNotice(null);
        const res = await fetch(`/api/billing/invoices/${invoiceId}`);
        const j = (await res.json().catch(() => null)) as {
          invoice?: CheckoutInvoice;
          error?: string;
        } | null;
        if (!res.ok) {
          throw new Error(j?.error || "Gagal memeriksa status");
        }
        if (j?.invoice) {
          setActiveInvoice(j.invoice);
          await reloadBilling();
        }
      } catch (e) {
        setCheckoutError(
          e instanceof Error ? e.message : "Gagal memeriksa status",
        );
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
  }, [
    checkoutOpen,
    checkoutStep,
    pollInvoiceId,
    pollInvoiceStatus,
    refreshInvoiceStatus,
  ]);

  const bankLabelForInvoice = useMemo(() => {
    const code =
      activeInvoice?.bankCode ?? pendingDesaInvoice?.bankCode ?? null;
    if (!code) return null;
    const b = vaBanks.find((x) => x.linkquBankCode === code);
    return b?.label ?? `Bank (kode ${code})`;
  }, [activeInvoice?.bankCode, pendingDesaInvoice?.bankCode, vaBanks]);

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
      setCheckoutNotice(null);
    }
  }, []);

  const lastInvoice = useMemo(() => {
    const inv = (data?.invoices ?? []).find(
      (x) => String(x.productType ?? "").toLowerCase() === "desa_package",
    );
    return inv ?? null;
  }, [data?.invoices]);

  return {
    checkoutLoading,
    checkoutError,
    setCheckoutError,
    checkoutNotice,
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
    pendingDesaInvoice,
    resumePendingInvoice,
    onConfirmBank,
    refreshInvoiceStatus,
    bankLabelForInvoice,
    lastInvoice,
    copyText,
  };
}
