"use client";

import { useEffect, useState } from "react";
import type { DesaSettings } from "../types";
import { desaSettings as fallbackDesaSettings } from "../constants";

/**
 * Pengaturan desa dari API (Village + Official + settings), fallback ke constants.
 */
export function useDesaSettings() {
  const [desaSettings, setDesaSettings] = useState<DesaSettings>(fallbackDesaSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/layanan-surat/desa-settings");
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as DesaSettings;
        if (!cancelled) setDesaSettings(data);
      } catch {
        if (!cancelled) setDesaSettings(fallbackDesaSettings);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { desaSettings, isLoading };
}
