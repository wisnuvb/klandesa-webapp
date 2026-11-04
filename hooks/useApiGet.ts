"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchJsonDeduped, peekFetchCache, subscribeFetchCache } from "@/lib/client/fetch-cache";

type State<T> = { url: string; data: T | null; off: boolean; error: string | null; stamp?: number };

export type UseApiGetOptions = {
  /** OPT-IN: data lebih muda dari ini dianggap segar (tanpa request saat mount/ganti url). Bawaan: tanpa cache lintas panggilan. */
  ttlMs?: number;
  /** OPT-IN: setelah ttl, data basi tampil seketika sambil dimuat ulang di latar belakang (stale-while-revalidate). */
  staleMs?: number;
};

/**
 * GET JSON sederhana: `loading` diturunkan dari url yang belum terjawab, jadi tanpa setState sinkron di effect.
 *
 * Tanpa `options` perilaku sama seperti dulu (`cache: "no-store"`): tiap mount memuat ulang; satu-satunya tambahan adalah
 * dedupe permintaan SERENTAK ke url yang sama (lib/client/fetch-cache). `reload()` selalu memuat ulang dari jaringan
 * (tidak ikut request yang sudah berjalan, supaya tidak mengembalikan data sebelum mutasi).
 * Dengan `{ ttlMs, staleMs }` hasil di-cache per-tab (dan dikosongkan saat identitas sesi berubah, lihat fetch-cache).
 */
export function useApiGet<T>(url: string | null, options?: UseApiGetOptions) {
  const ttlMs = options?.ttlMs ?? 0;
  const staleMs = options?.staleMs ?? 0;
  const cached = ttlMs + staleMs > 0;

  const [state, setState] = useState<State<T> | null>(null);
  const [nonce, setNonce] = useState(0);
  const forceRef = useRef(false);

  useEffect(() => {
    if (!url) return;
    const ctrl = new AbortController();
    const force = forceRef.current;
    forceRef.current = false;

    fetchJsonDeduped<{ error?: unknown; code?: unknown } & Record<string, unknown>>(url, {
      ttlMs,
      staleMs,
      force,
      signal: ctrl.signal,
    })
      .then((res) => {
        const body = res.body;
        if (res.status === 409 && body?.code === "KEPENDUDUKAN_V2_OFF") return setState({ url, data: null, off: true, error: null });
        if (!res.ok) return setState({ url, data: null, off: false, error: typeof body?.error === "string" ? body.error : "Gagal memuat data" });
        setState({ url, data: body as T, off: false, error: null, stamp: res.stamp });
      })
      .catch((e) => {
        if ((e as Error).name !== "AbortError") setState({ url, data: null, off: false, error: "Tidak bisa terhubung. Periksa koneksi lalu coba lagi." });
      });

    // Revalidasi latar belakang (atau hasil dari hook lain) memperbarui tampilan; hanya bila opt-in.
    const unsubscribe = cached
      ? subscribeFetchCache(url, (res) => {
          if (ctrl.signal.aborted || !res.ok) return;
          setState((prev) =>
            prev && prev.url === url && prev.stamp === res.stamp ? prev : { url, data: res.body as T, off: false, error: null, stamp: res.stamp },
          );
        })
      : undefined;

    return () => {
      ctrl.abort();
      unsubscribe?.();
    };
  }, [url, nonce, ttlMs, staleMs, cached]);

  // Render awal tanpa kedipan "memuat" bila datanya sudah ada di cache (hanya opt-in).
  const warm = cached && url && !(state?.url === url) ? peekFetchCache<T>(url, { ttlMs, staleMs }) : null;
  const current = url && state?.url === url ? state : null;
  const warmData = warm?.body ?? null;
  return {
    data: current?.data ?? warmData,
    off: current?.off ?? false,
    error: current?.error ?? null,
    loading: Boolean(url) && !current && !warm,
    reload: useCallback(() => {
      forceRef.current = true;
      setNonce((n) => n + 1);
    }, []),
  };
}
