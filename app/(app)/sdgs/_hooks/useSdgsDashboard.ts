"use client";

import { useCallback, useEffect, useState } from "react";
import type { SdgsDashboardPayload } from "@/lib/sdgs/types";

export function useSdgsDashboard() {
  const [data, setData] = useState<SdgsDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sdgs/dashboard");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal memuat dashboard SDGs");
      setData(json.data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat dashboard SDGs");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}
