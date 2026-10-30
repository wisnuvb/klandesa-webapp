"use client";

import { useCallback, useEffect, useState } from "react";

export type HistoryInvoice = {
  id: string;
  invoiceNumber: string;
  productType: string;
  planCode: string;
  amount: number;
  status: string;
  canResume: boolean;
  paymentMethod: string | null;
  paymentUrl: string | null;
  qrContent: string | null;
  qrImageUrl: string | null;
  vaNumber: string | null;
  bankCode: string | null;
  retailCode: string | null;
  expiresAt: string | null;
  paidAt: string | null;
  createdAt: string;
  items: Array<{ id: string; name: string; description: string | null; quantity: number; totalAmount: number }>;
};

export type HistoryFilters = { status: string; productType: string; page: number };

type HistoryResponse = {
  invoices: HistoryInvoice[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  pendingCount: number;
  productTypes: string[];
};

const PAGE_SIZE = 10;

export function useInvoiceHistory(filters: HistoryFilters) {
  const { status, productType, page } = filters;
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
        if (status) qs.set("status", status);
        if (productType) qs.set("productType", productType);
        const res = await fetch(`/api/billing/invoices?${qs}`, { cache: "no-store", signal: controller.signal });
        const j = (await res.json().catch(() => null)) as (HistoryResponse & { error?: string }) | null;
        if (!res.ok || !j?.invoices) throw new Error(j?.error || "Gagal memuat riwayat pembayaran");
        setData(j);
      } catch (e) {
        if (controller.signal.aborted) return;
        setError(
          e instanceof TypeError
            ? "Tidak bisa terhubung ke server. Periksa koneksi internet Anda lalu coba lagi."
            : e instanceof Error
              ? e.message
              : "Gagal memuat riwayat pembayaran",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [status, productType, page, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, reload };
}
