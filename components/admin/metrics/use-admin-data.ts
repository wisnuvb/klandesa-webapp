"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AdminDataState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

/** GET JSON dari /api/admin/*. url null = tidak memuat. Galat selalu berupa teks Indonesia (tanpa stack/SQL). */
export function useAdminData<T>(url: string | null): AdminDataState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(url != null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const seq = useRef(0);

  useEffect(() => {
    if (url == null) return;
    const mine = ++seq.current;
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(url, { cache: "no-store", signal: ctrl.signal });
        const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
        if (mine !== seq.current) return;
        if (!res.ok || !body) {
          setError(
            res.status === 401 ? "Sesi berakhir. Muat ulang halaman dan masuk lagi."
              : res.status === 403 ? "Akun ini tidak berhak melihat data tersebut."
              : (body && typeof body.error === "string" ? body.error : "Data belum bisa dimuat."),
          );
          return;
        }
        setData(body);
      } catch (e) {
        if ((e as { name?: string }).name === "AbortError") return;
        if (mine === seq.current) setError("Tidak bisa terhubung ke server. Periksa koneksi lalu coba lagi.");
      } finally {
        if (mine === seq.current) setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [url, tick]);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { data, loading, error, reload };
}
