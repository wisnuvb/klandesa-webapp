"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type {
  BumdesSummaryDetail,
  BumdesSummaryResponse,
  BumdesTransactionRow,
  BumdesUnitRow,
} from "../_lib/types";

export function useBumdes() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<BumdesSummaryResponse | null>(null);
  const [units, setUnits] = useState<BumdesUnitRow[]>([]);
  const [transactions, setTransactions] = useState<BumdesTransactionRow[]>([]);
  const [detail, setDetail] = useState<BumdesSummaryDetail | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadProfile = useCallback(async () => {
    const res = await fetch("/api/bumdes", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json?.error ?? "Gagal memuat profil BUMDes");
    }
    setSummary(json.data ?? null);
    return json.data as BumdesSummaryResponse | null;
  }, []);

  const loadUnits = useCallback(async () => {
    const res = await fetch("/api/bumdes/units", { cache: "no-store" });
    if (!res.ok) return;
    const json = await res.json();
    setUnits(Array.isArray(json.data) ? json.data : []);
  }, []);

  const loadTransactions = useCallback(async () => {
    const res = await fetch("/api/bumdes/transactions", { cache: "no-store" });
    if (!res.ok) return;
    const json = await res.json();
    setTransactions(Array.isArray(json.data) ? json.data : []);
  }, []);

  const loadDetail = useCallback(async () => {
    const res = await fetch("/api/bumdes/summary", { cache: "no-store" });
    if (!res.ok) return;
    const json = await res.json();
    setDetail(json.data ?? null);
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const profile = await loadProfile();
      if (profile?.needsBootstrap) {
        setUnits([]);
        setTransactions([]);
        setDetail(null);
        return;
      }
      await Promise.all([loadUnits(), loadTransactions(), loadDetail()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data BUMDes");
      setSummary(null);
      setUnits([]);
      setTransactions([]);
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [loadProfile, loadUnits, loadTransactions, loadDetail]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const bootstrapBumdes = useCallback(
    async (name?: string) => {
      const res = await fetch("/api/bumdes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(name ? { name } : {}),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body?.error ?? "Gagal membuat BUMDes");
        return false;
      }
      toast.success(body?.message ?? "BUMDes dibuat");
      await reload();
      return true;
    },
    [reload],
  );

  const filteredUnits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const source = detail?.units?.length ? detail.units : units;
    if (!q) return source;
    return source.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.category ?? "").toLowerCase().includes(q),
    );
  }, [units, detail, searchQuery]);

  const canManage = summary?.canManage ?? false;

  return {
    loading,
    error,
    summary,
    units,
    transactions,
    detail,
    searchQuery,
    setSearchQuery,
    filteredUnits,
    canManage,
    reload,
    bootstrapBumdes,
    refreshUnits: loadUnits,
    refreshTransactions: loadTransactions,
    refreshDetail: loadDetail,
  };
}
