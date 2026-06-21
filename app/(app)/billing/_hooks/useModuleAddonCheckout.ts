"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LINKQU_EWALLET_CHANNELS,
  type LinkquEwalletRetailCode,
} from "@/lib/payment/linkqu-channels";
import type {
  BillingStatusResponse,
  CheckoutInvoice,
  CheckoutResponse,
  VaBank,
} from "../_lib/types";

export type ModuleActivatePayload = {
  moduleId: string;
  planCode: string;
  label: string;
  monthlyFee: number;
};

type CheckoutStep = "method" | "payment";
type PaymentMethod = "va" | "ewallet";

export function useModuleAddonCheckout(params: {
  data: BillingStatusResponse | null;
  reloadBilling: () => Promise<void>;
}) {
  const { data, reloadBilling } = params;

  const [open, setOpen] = useState(false);
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [planCode, setPlanCode] = useState<string | null>(null);
  const [moduleLabel, setModuleLabel] = useState("");
  const [monthlyFee, setMonthlyFee] = useState<number | null>(null);

  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("method");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("va");
  const [vaBanks, setVaBanks] = useState<VaBank[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [selectedBankCode, setSelectedBankCode] = useState("");
  const [selectedRetailCode, setSelectedRetailCode] =
    useState<LinkquEwalletRetailCode>("PAYDANA");
  const [ewalletPhone, setEwalletPhone] = useState("");

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const [activeInvoice, setActiveInvoice] = useState<CheckoutInvoice | null>(
    null,
  );
  const [statusCheckLoading, setStatusCheckLoading] = useState(false);

  const ewalletChannels = useMemo(
    () => LINKQU_EWALLET_CHANNELS.filter((c) => c.enabled),
    [],
  );

  const pendingModuleInvoice = useMemo(() => {
    if (!planCode) return null;
    const inv = (data?.invoices ?? []).find((x) => {
      if (String(x.productType ?? "").toLowerCase() !== "module_addon")
        return false;
      if (String(x.planCode ?? "") !== planCode) return false;
      if (String(x.status ?? "").toLowerCase() !== "pending") return false;
      if (!x.expiresAt) return true;
      return new Date(x.expiresAt).getTime() > Date.now();
    });
    return inv ?? null;
  }, [data?.invoices, planCode]);

  useEffect(() => {
    if (!open || checkoutStep !== "method") return;
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
        if (!cancelled) {
          const banks = j?.banks ?? [];
          setVaBanks(banks);
          setSelectedBankCode((prev) => prev || banks[0]?.linkquBankCode || "");
        }
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
  }, [open, checkoutStep]);

  const resumePendingInvoice = useCallback(
    (inv: NonNullable<typeof pendingModuleInvoice>) => {
      setCheckoutStep("payment");
      setCheckoutError(null);
      setCheckoutNotice(
        "Masih ada invoice pending untuk modul ini. Selesaikan pembayaran agar tidak terjadi tagihan ganda.",
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
      setOpen(true);
    },
    [],
  );

  const openCheckout = useCallback(
    (payload: ModuleActivatePayload) => {
      setModuleId(payload.moduleId);
      setPlanCode(payload.planCode);
      setModuleLabel(payload.label);
      setMonthlyFee(payload.monthlyFee);
      setCheckoutError(null);
      setCheckoutNotice(null);
      setActiveInvoice(null);
      setPaymentMethod("va");
      setSelectedRetailCode("PAYDANA");
      setEwalletPhone("");
      setSelectedBankCode("");

      const pending = (data?.invoices ?? []).find((x) => {
        if (String(x.productType ?? "").toLowerCase() !== "module_addon")
          return false;
        if (String(x.planCode ?? "") !== payload.planCode) return false;
        if (String(x.status ?? "").toLowerCase() !== "pending") return false;
        if (!x.expiresAt) return true;
        return new Date(x.expiresAt).getTime() > Date.now();
      });

      if (pending) {
        resumePendingInvoice(pending);
        return;
      }

      setCheckoutStep("method");
      setOpen(true);
    },
    [data?.invoices, resumePendingInvoice],
  );

  const createCheckout = useCallback(async () => {
    if (!planCode) return;

    if (paymentMethod === "va" && !selectedBankCode) {
      setCheckoutError("Pilih bank virtual account.");
      return;
    }

    if (paymentMethod === "ewallet") {
      const phone = ewalletPhone.replace(/\D/g, "");
      if (phone.length < 10) {
        setCheckoutError("Nomor HP e-wallet wajib diisi (min. 10 digit).");
        return;
      }
    }

    try {
      setCheckoutLoading(true);
      setCheckoutError(null);
      setCheckoutNotice(null);

      const body: Record<string, string> = {
        productType: "module_addon",
        planCode,
        paymentMethod,
      };

      if (paymentMethod === "va") {
        body.bankCode = selectedBankCode;
      } else {
        body.retailCode = selectedRetailCode;
        body.ewalletPhone = ewalletPhone.replace(/\D/g, "");
      }

      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
      setActiveInvoice(ok.invoice);
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
  }, [
    ewalletPhone,
    paymentMethod,
    planCode,
    reloadBilling,
    selectedBankCode,
    selectedRetailCode,
  ]);

  const refreshInvoiceStatus = useCallback(
    async (invoiceId: string) => {
      try {
        setStatusCheckLoading(true);
        setCheckoutError(null);
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
    if (!open || checkoutStep !== "payment" || !pollInvoiceId) return;
    if (pollInvoiceStatus?.toLowerCase() !== "pending") return;

    const t = window.setInterval(() => {
      void refreshInvoiceStatus(pollInvoiceId);
    }, 8000);

    return () => window.clearInterval(t);
  }, [checkoutStep, open, pollInvoiceId, pollInvoiceStatus, refreshInvoiceStatus]);

  const bankLabelForInvoice = useMemo(() => {
    const code = activeInvoice?.bankCode ?? pendingModuleInvoice?.bankCode ?? null;
    if (!code) return null;
    const b = vaBanks.find((x) => x.linkquBankCode === code);
    return b?.label ?? `Bank (kode ${code})`;
  }, [activeInvoice?.bankCode, pendingModuleInvoice?.bankCode, vaBanks]);

  const copyText = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setCheckoutError("Tidak bisa menyalin ke clipboard");
    }
  }, []);

  const setDialogOpen = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) {
      setModuleId(null);
      setPlanCode(null);
      setModuleLabel("");
      setMonthlyFee(null);
      setCheckoutStep("method");
      setPaymentMethod("va");
      setSelectedBankCode("");
      setSelectedRetailCode("PAYDANA");
      setEwalletPhone("");
      setCheckoutError(null);
      setCheckoutNotice(null);
      setActiveInvoice(null);
    }
  }, []);

  return {
    open,
    setDialogOpen,
    openCheckout,
    moduleId,
    moduleLabel,
    monthlyFee,
    checkoutStep,
    paymentMethod,
    setPaymentMethod,
    vaBanks,
    banksLoading,
    selectedBankCode,
    setSelectedBankCode,
    ewalletChannels,
    selectedRetailCode,
    setSelectedRetailCode,
    ewalletPhone,
    setEwalletPhone,
    checkoutLoading,
    checkoutError,
    checkoutNotice,
    activeInvoice,
    onConfirmCheckout: createCheckout,
    refreshInvoiceStatus,
    statusCheckLoading,
    bankLabelForInvoice,
    copyText,
  };
}
