"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type {
  CoopAccessResponse,
  CoopLedgerRow,
  CoopMemberRow,
  CoopSummaryResponse,
  LinkUserOption,
} from "../_lib/types";

export function useKoperasi() {
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<CoopAccessResponse | null>(null);
  const [summary, setSummary] = useState<CoopSummaryResponse | null>(null);
  const [members, setMembers] = useState<CoopMemberRow[]>([]);
  const [ledger, setLedger] = useState<CoopLedgerRow[]>([]);
  const [linkUsers, setLinkUsers] = useState<LinkUserOption[]>([]);
  const [tab, setTab] = useState<"overview" | "members" | "ledger">("overview");

  const refreshAccess = useCallback(async () => {
    const res = await fetch("/api/coop/access", { cache: "no-store" });
    if (!res.ok) {
      setAccess(null);
      return false;
    }
    const json = (await res.json()) as CoopAccessResponse;
    setAccess(json);
    return json.showCoopMenu;
  }, []);

  const refreshSummary = useCallback(async () => {
    const res = await fetch("/api/coop", { cache: "no-store" });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 402) toast.error(err?.error ?? "Langganan tidak aktif");
      setSummary(null);
      return;
    }
    const body = (await res.json()) as {
      success?: boolean;
      data?: CoopSummaryResponse;
    };
    setSummary(body.data ?? null);
  }, []);

  const refreshMembers = useCallback(async () => {
    const res = await fetch("/api/coop/members", { cache: "no-store" });
    if (!res.ok) return;
    const body = (await res.json()) as { data?: CoopMemberRow[] };
    setMembers(body.data ?? []);
  }, []);

  const refreshLedger = useCallback(async () => {
    const res = await fetch("/api/coop/ledger", { cache: "no-store" });
    if (!res.ok) return;
    const body = (await res.json()) as { data?: CoopLedgerRow[] };
    setLedger(body.data ?? []);
  }, []);

  const refreshLinkUsers = useCallback(async () => {
    const res = await fetch("/api/coop/users-for-link", { cache: "no-store" });
    if (!res.ok) return;
    const body = (await res.json()) as { data?: LinkUserOption[] };
    setLinkUsers(body.data ?? []);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const shown = await refreshAccess();
      if (!shown) {
        setSummary(null);
        setMembers([]);
        setLedger([]);
        return;
      }
      await refreshSummary();
    } finally {
      setLoading(false);
    }
  }, [refreshAccess, refreshSummary]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!summary?.cooperative) return;
    if (tab === "members") {
      void refreshMembers();
      if (summary.canManage) void refreshLinkUsers();
    }
    if (tab === "ledger") void refreshLedger();
    if (tab === "overview") {
      void refreshMembers();
      void refreshLedger();
      if (summary.canManage) void refreshLinkUsers();
    }
  }, [
    summary?.cooperative,
    summary?.canManage,
    tab,
    refreshMembers,
    refreshLedger,
    refreshLinkUsers,
  ]);

  const bootstrapCoop = useCallback(
    async (name?: string) => {
      const res = await fetch("/api/coop/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(name ? { name } : {}),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        toast.error(body?.error ?? "Gagal membuat koperasi");
        return false;
      }
      toast.success(body?.message ?? "Koperasi dibuat");
      await loadAll();
      return true;
    },
    [loadAll],
  );

  const blocked = useMemo(() => access && !access.showCoopMenu, [access]);
  const canManage = summary?.canManage ?? false;

  return {
    loading,
    access,
    summary,
    members,
    ledger,
    linkUsers,
    tab,
    setTab,
    blocked,
    canManage,
    refreshSummary,
    refreshMembers,
    refreshLedger,
    refreshLinkUsers,
    bootstrapCoop,
    loadAll,
  };
}
