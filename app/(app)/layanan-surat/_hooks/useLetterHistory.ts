"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LetterHistory } from "../types";

export const HISTORY_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

type HistoryPayload = {
  items: LetterHistory[];
  total: number;
  counts: { all: number; completed: number; draft: number };
  categories: string[];
};

const EMPTY: HistoryPayload = { items: [], total: 0, counts: { all: 0, completed: 0, draft: 0 }, categories: [] };

/**
 * Riwayat surat: paginasi, pencarian, dan saringan dikerjakan server (`GET /api/mail-services?page=…`),
 * jadi yang dimuat hanya satu halaman. Pencarian ditunda sebentar agar tidak memanggil server tiap ketikan;
 * hasil halaman sebelumnya tetap tampil selama halaman baru dimuat (tidak berkedip kosong).
 */
export function useLetterHistory() {
  const [data, setData] = useState<HistoryPayload>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatusState] = useState("all");
  const [category, setCategoryState] = useState("all");
  const [nonce, setNonce] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  // Ketikan pencarian -> `query` efektif setelah jeda; kembali ke halaman pertama.
  useEffect(() => {
    if (queryInput === query) return undefined;
    const t = window.setTimeout(() => {
      setQuery(queryInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [queryInput, query]);

  useEffect(() => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const params = new URLSearchParams({ page: String(page), pageSize: String(HISTORY_PAGE_SIZE) });
    if (query) params.set("q", query);
    if (status !== "all") params.set("status", status);
    if (category !== "all") params.set("category", category);

    (async () => {
      // Jeda satu tick: pembaruan state di bawah bukan sinkron dalam badan effect.
      await Promise.resolve();
      if (ac.signal.aborted) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/mail-services?${params}`, { signal: ac.signal });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error || "Gagal memuat riwayat surat.");
        }
        const payload = (await res.json()) as HistoryPayload;
        if (ac.signal.aborted) return;
        setData(payload);
        setError("");
        setLoaded(true);
      } catch (e) {
        if (ac.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Gagal memuat riwayat surat.");
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [page, query, status, category, nonce]);

  const setStatus = useCallback((v: string) => { setStatusState(v); setPage(1); }, []);
  const setCategory = useCallback((v: string) => { setCategoryState(v); setPage(1); }, []);
  const retry = useCallback(() => setNonce((n) => n + 1), []);

  const pageCount = Math.max(1, Math.ceil(data.total / HISTORY_PAGE_SIZE));
  // Bila data berkurang (mis. halaman terakhir kosong), tampilkan halaman terakhir yang ada.
  useEffect(() => {
    if (loaded && !loading && page > pageCount) setPage(pageCount);
  }, [loaded, loading, page, pageCount]);

  return {
    items: data.items,
    total: data.total,
    counts: data.counts,
    categories: data.categories,
    loading,
    loaded,
    error,
    page,
    pageCount,
    pageSize: HISTORY_PAGE_SIZE,
    queryInput,
    status,
    category,
    setPage,
    setQueryInput,
    setStatus,
    setCategory,
    retry,
  };
}
