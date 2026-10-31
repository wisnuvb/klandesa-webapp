"use client";

import { useCallback, useEffect, useState } from "react";

type State<T> = { url: string; data: T | null; off: boolean; error: string | null };

/** GET JSON sederhana: `loading` diturunkan dari url yang belum terjawab, jadi tanpa setState sinkron di effect. */
export function useApiGet<T>(url: string | null) {
  const [state, setState] = useState<State<T> | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!url) return;
    const ctrl = new AbortController();
    fetch(url, { cache: "no-store", signal: ctrl.signal })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (res.status === 409 && body?.code === "KEPENDUDUKAN_V2_OFF") return setState({ url, data: null, off: true, error: null });
        if (!res.ok) return setState({ url, data: null, off: false, error: typeof body?.error === "string" ? body.error : "Gagal memuat data" });
        setState({ url, data: body as T, off: false, error: null });
      })
      .catch((e) => {
        if ((e as Error).name !== "AbortError") setState({ url, data: null, off: false, error: "Tidak bisa terhubung. Periksa koneksi lalu coba lagi." });
      });
    return () => ctrl.abort();
  }, [url, nonce]);

  const current = url && state?.url === url ? state : null;
  return {
    data: current?.data ?? null,
    off: current?.off ?? false,
    error: current?.error ?? null,
    loading: Boolean(url) && !current,
    reload: useCallback(() => setNonce((n) => n + 1), []),
  };
}
