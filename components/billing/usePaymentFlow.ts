"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LinkquEwalletRetailCode } from "@/lib/payment/linkqu-channels";
import { priceForMonths, type SubscriptionMonths } from "@/lib/billing/duration";
import {
  ALL_PAYMENT_METHODS,
  type PaymentInvoice,
  type PaymentMethod,
  type PaymentOptions,
  type PaymentRequest,
} from "./types";

const POLL_INTERVAL_MS = 8000;

/** Gagal jaringan di browser ("Failed to fetch") diganti pesan yang dimengerti pengguna non-teknis. */
function friendlyMessage(e: unknown, fallback: string): string {
  if (e instanceof TypeError || (e instanceof Error && /failed to fetch|networkerror|load failed/i.test(e.message))) {
    return "Tidak bisa terhubung ke server. Periksa koneksi internet Anda lalu coba lagi.";
  }
  return e instanceof Error && e.message ? e.message : fallback;
}

/**
 * Logika pembayaran LinkQu untuk seluruh aplikasi: buat tagihan lewat /api/billing/checkout, pantau status
 * (server menyinkronkan ke LinkQu bila callback terlambat), lalu panggil `onPaid` sekali saat lunas.
 */
export function usePaymentFlow() {
  const [request, setRequest] = useState<PaymentRequest | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("qris");
  const [bankCode, setBankCode] = useState("");
  const [retailCode, setRetailCode] = useState<LinkquEwalletRetailCode>("PAYDANA");
  const [phone, setPhone] = useState("");
  const [months, setMonths] = useState<SubscriptionMonths>(1);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [checking, setChecking] = useState(false);
  const [invoice, setInvoice] = useState<PaymentInvoice | null>(null);

  const paidNotified = useRef<string | null>(null);
  const requestRef = useRef<PaymentRequest | null>(null);
  useEffect(() => {
    requestRef.current = request;
  }, [request]);

  const open = request != null;
  const methods = request?.methods?.length ? request.methods : ALL_PAYMENT_METHODS;

  // Total yang akan ditagih (ikut durasi), dipakai untuk menilai batas nominal tiap kanal.
  const durationsOn = Boolean(request?.durations?.length);
  const total = request ? (durationsOn ? priceForMonths(request.amount, months) : request.amount) : 0;

  const [options, setOptions] = useState<PaymentOptions | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const showForm = open && !invoice;

  useEffect(() => {
    if (!showForm) return;
    const controller = new AbortController();
    (async () => {
      setOptionsLoading(true);
      try {
        const res = await fetch(`/api/billing/payment-options?amount=${total}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const j = (await res.json().catch(() => null)) as (PaymentOptions & { error?: string }) | null;
        if (!res.ok || !j?.methods) throw new Error(j?.error || "Gagal memuat metode pembayaran");
        setOptions(j);
      } catch (e) {
        if (controller.signal.aborted) return;
        setOptions(null);
        setError(friendlyMessage(e, "Gagal memuat metode pembayaran"));
      } finally {
        if (!controller.signal.aborted) setOptionsLoading(false);
      }
    })();
    return () => controller.abort();
  }, [showForm, total]);

  // Pilihan yang tidak lagi tersedia (nominal berubah / kanal ditutup) otomatis dialihkan ke yang tersedia.
  useEffect(() => {
    if (!options) return;
    const firstOk = methods.find((m) => options.methods[m]?.available);
    if (firstOk && !options.methods[method]?.available) setMethod(firstOk);
    const bank = options.banks.find((b) => b.linkquBankCode === bankCode);
    if (!bank?.available) setBankCode(options.banks.find((b) => b.available)?.linkquBankCode ?? "");
    const wallet = options.ewallets.find((w) => w.retailCode === retailCode);
    if (!wallet?.available) {
      const ok = options.ewallets.find((w) => w.available);
      if (ok) setRetailCode(ok.retailCode);
    }
  }, [options, methods, method, bankCode, retailCode]);

  const banks = options?.banks ?? [];
  const ewalletChannels = options?.ewallets ?? [];
  const anyMethodAvailable = options ? methods.some((m) => options.methods[m]?.available) : true;

  const fetchInvoice = useCallback(async (invoiceId: string): Promise<PaymentInvoice> => {
    const res = await fetch(`/api/billing/invoices/${invoiceId}`, { cache: "no-store" });
    const j = (await res.json().catch(() => null)) as { invoice?: PaymentInvoice; error?: string } | null;
    if (!res.ok || !j?.invoice) throw new Error(j?.error || "Gagal memeriksa status");
    return j.invoice;
  }, []);

  const pay = useCallback(
    (next: PaymentRequest) => {
      const allowed = next.methods?.length ? next.methods : ALL_PAYMENT_METHODS;
      setRequest(next);
      setMethod(allowed[0]);
      setPhone("");
      setMonths(next.durations?.[0] ?? 1);
      setFieldError(null);
      setError(null);
      setNotice(null);
      setInvoice(null);
      setCreating(false);
      paidNotified.current = null;

      if (next.resumeInvoiceId) {
        void fetchInvoice(next.resumeInvoiceId)
          .then((inv) => setInvoice(inv))
          .catch((e) => setError(friendlyMessage(e, "Gagal memuat tagihan")));
      }
    },
    [fetchInvoice],
  );

  const close = useCallback(() => {
    setRequest(null);
    setInvoice(null);
    setFieldError(null);
    setError(null);
    setNotice(null);
    setCreating(false);
  }, []);

  /** Kembali ke pilihan metode (mis. setelah tagihan kedaluwarsa). */
  const restart = useCallback(() => {
    // Lepas tautan ke tagihan lama supaya form pilihan metode muncul (bukan "Memuat tagihan…" terus-menerus).
    setRequest((r) => (r ? { ...r, resumeInvoiceId: undefined } : r));
    setInvoice(null);
    setError(null);
    setNotice(null);
  }, []);

  const submit = useCallback(async () => {
    const req = requestRef.current;
    if (!req) return;
    setFieldError(null);
    setError(null);

    if (options && !options.methods[method]?.available) {
      setFieldError(`${options.methods[method]?.reason ?? "Metode ini sedang tidak tersedia"}. Pilih metode lain.`);
      return;
    }
    if (method === "va" && !bankCode) {
      setFieldError("Pilih bank virtual account.");
      return;
    }
    const digits = phone.replace(/\D/g, "");
    if (method === "ewallet" && !/^(0|62)8\d{8,11}$/.test(digits)) {
      setFieldError("Nomor HP e-wallet harus diawali 08 dan 10–13 digit.");
      return;
    }

    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        productType: req.productType,
        planCode: req.planCode,
        paymentMethod: method,
      };
      const metadata = { ...req.metadata, ...(req.durations?.length ? { months } : {}) };
      if (Object.keys(metadata).length > 0) body.metadata = metadata;
      if (method === "va") body.bankCode = bankCode;
      if (method === "ewallet") {
        body.retailCode = retailCode;
        body.ewalletPhone = digits;
      }
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json().catch(() => null)) as
        | { invoice?: PaymentInvoice; reused?: boolean; error?: string }
        | null;
      if (!res.ok || !j?.invoice?.id) throw new Error(j?.error || "Gagal membuat tagihan");
      setInvoice(j.invoice);
      if (j.reused) setNotice("Tagihan yang belum dibayar dipakai kembali agar tidak terjadi tagihan ganda.");
    } catch (e) {
      setError(friendlyMessage(e, "Gagal membuat tagihan"));
    } finally {
      setCreating(false);
    }
  }, [method, bankCode, retailCode, phone, months, options]);

  const refresh = useCallback(
    async (invoiceId: string, silent = false) => {
      if (!silent) setChecking(true);
      try {
        setInvoice(await fetchInvoice(invoiceId));
      } catch (e) {
        if (!silent) setError(friendlyMessage(e, "Gagal memeriksa status"));
      } finally {
        if (!silent) setChecking(false);
      }
    },
    [fetchInvoice],
  );

  const invoiceId = invoice?.id;
  const invoiceStatus = invoice?.status?.toLowerCase();

  useEffect(() => {
    if (!invoiceId || invoiceStatus !== "pending") return;
    const t = window.setInterval(() => void refresh(invoiceId, true), POLL_INTERVAL_MS);
    return () => window.clearInterval(t);
  }, [invoiceId, invoiceStatus, refresh]);

  useEffect(() => {
    if (invoiceStatus !== "paid" || !invoiceId || paidNotified.current === invoiceId) return;
    paidNotified.current = invoiceId;
    void Promise.resolve(requestRef.current?.onPaid?.()).catch(() => undefined);
  }, [invoiceId, invoiceStatus]);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Nomor disalin.");
    } catch {
      setError("Tidak bisa menyalin ke clipboard");
    }
  }, []);

  return {
    open,
    request,
    methods,
    pay,
    close,
    restart,
    method,
    setMethod,
    banks,
    optionsLoading,
    options,
    anyMethodAvailable,
    total,
    bankCode,
    setBankCode,
    ewalletChannels,
    retailCode,
    setRetailCode,
    phone,
    setPhone,
    months,
    setMonths,
    fieldError,
    error,
    notice,
    creating,
    submit,
    invoice,
    checking,
    refresh,
    copy,
  };
}

export type PaymentFlow = ReturnType<typeof usePaymentFlow>;
