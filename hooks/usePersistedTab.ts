"use client";

import { useCallback, useMemo, useState } from "react";

const STORAGE_PREFIX = "klandesa:tab:";

function readPersistedTab<T extends string>(
  storageKey: string,
  defaultValue: T,
  allowed: readonly T[],
): T {
  const allowedSet = new Set<string>(allowed);
  if (typeof window === "undefined") {
    return defaultValue;
  }
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw && allowedSet.has(raw)) {
      return raw as T;
    }
  } catch {
    // localStorage tidak tersedia atau diblokir
  }
  return defaultValue;
}

/**
 * Menyimpan tab aktif ke localStorage agar tetap sama saat user kembali ke halaman.
 * Daftar `allowed` sebaiknya didefinisikan sebagai konstanta di luar komponen (referensi stabil).
 */
export function usePersistedTab<T extends string>(
  pageKey: string,
  defaultValue: T,
  allowed: readonly T[]
): readonly [T, (next: string) => void] {
  const storageKey = `${STORAGE_PREFIX}${pageKey}`;
  const allowedSet = useMemo(
    () => new Set<string>(allowed),
    // Daftar tab biasanya konstanta modul; join membuat deps aman jika referensi array berubah
    [allowed]
  );

  const [value, setValue] = useState<T>(() =>
    readPersistedTab(storageKey, defaultValue, allowed),
  );

  const setTab = useCallback(
    (next: string) => {
      if (!allowedSet.has(next)) return;
      const v = next as T;
      setValue(v);
      try {
        localStorage.setItem(storageKey, v);
      } catch {
        // ignore
      }
    },
    [allowedSet, storageKey]
  );

  return [value, setTab] as const;
}
