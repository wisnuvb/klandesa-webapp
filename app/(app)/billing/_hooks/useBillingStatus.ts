"use client";

import { useCallback, useEffect, useState } from "react";
import type { BillingStatusResponse } from "../_lib/types";

export function useBillingStatus() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BillingStatusResponse | null>(null);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/billing/status");
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || "Gagal memuat billing");
      }
      const j = (await res.json()) as BillingStatusResponse;
      setData(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat billing");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { loading, error, data, reload };
}

