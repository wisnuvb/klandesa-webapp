"use client";

import { useCallback, useEffect, useState } from "react";
import type { DeliveryView } from "@/components/permissions/InviteResultDialog";
import type { AccountView, OfficialOption } from "../_lib/types";

type Failure = { ok: false; error: string };

async function call<T>(url: string, init?: RequestInit): Promise<({ ok: true } & T) | Failure> {
  try {
    const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) }, cache: "no-store" });
    const json = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) return { ok: false, error: json.error ?? "Terjadi kesalahan. Coba lagi." };
    return { ok: true, ...json };
  } catch {
    return { ok: false, error: "Tidak dapat terhubung ke server. Periksa koneksi Anda." };
  }
}

const fetchAll = () => call<{ users: AccountView[]; officialsWithoutAccount: OfficialOption[] }>("/api/rbac/users");

export function useAccessUsers() {
  const [users, setUsers] = useState<AccountView[]>([]);
  const [officials, setOfficials] = useState<OfficialOption[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((r: Awaited<ReturnType<typeof fetchAll>>) => {
    if (r.ok) {
      setError(null);
      setUsers(r.users);
      setOfficials(r.officialsWithoutAccount);
    } else {
      setError(r.error);
    }
    setLoading(false);
  }, []);

  const load = useCallback(async () => apply(await fetchAll()), [apply]);

  useEffect(() => {
    let cancelled = false;
    void fetchAll().then((r) => {
      if (!cancelled) apply(r);
    });
    return () => {
      cancelled = true;
    };
  }, [apply]);

  const update = useCallback(
    async (id: number, body: Record<string, unknown>) => {
      const r = await call<{ account: AccountView; delivery?: DeliveryView }>(`/api/rbac/users/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      if (r.ok) setUsers((prev) => prev.map((u) => (u.id === id ? r.account : u)));
      return r;
    },
    [],
  );

  const create = useCallback(
    async (body: Record<string, unknown>) => {
      const r = await call<{ userId: number; email: string; role: string; delivery: DeliveryView | null }>("/api/rbac/users", { method: "POST", body: JSON.stringify(body) });
      if (r.ok) await load();
      return r;
    },
    [load],
  );

  return { users, officials, isLoading, error, reload: load, update, create };
}
