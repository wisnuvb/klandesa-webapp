"use client";

import { useCallback, useEffect, useState } from "react";
import { readError } from "./types";

export type SectionState<T> = { data: T | null; loading: boolean; error: string | null; reload: () => void };

/** Muat satu bagian Inspektur Desa (baca-saja). Memuat saat dipasang; `reload` untuk Coba lagi. */
export function useInspectSection<T>(villageId: number, section: "users" | "activity" | "health" | "modules"): SectionState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(`/api/admin/villages/${villageId}/inspect?section=${section}`, { cache: "no-store", signal: ctrl.signal });
        if (!res.ok) throw await readError(res, "Gagal memuat data.");
        setData((await res.json()) as T);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Gagal memuat data.");
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [villageId, section, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, loading, error, reload };
}
