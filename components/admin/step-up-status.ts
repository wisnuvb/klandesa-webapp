"use client";

import { useEffect, useState } from "react";

/**
 * Apakah akun admin yang sedang masuk memakai 2FA (maka konfirmasi aksi berisiko juga meminta kode)? Diambil dari
 * `GET /api/admin/security/status` dan disimpan di cache modul (satu permintaan bersama untuk semua dialog) selama 60 detik.
 * `invalidateStepUpStatus()` dipanggil setelah 2FA diaktifkan/dinonaktifkan atau bila server menolak karena kode dibutuhkan.
 */
const TTL_MS = 60_000;
let cached: { at: number; totpEnabled: boolean } | null = null;
let inflight: Promise<boolean | null> | null = null;

export function invalidateStepUpStatus(): void {
  cached = null;
}

async function fetchStatus(force = false): Promise<boolean | null> {
  if (!force && cached && Date.now() - cached.at < TTL_MS) return cached.totpEnabled;
  inflight ??= fetch("/api/admin/security/status", { cache: "no-store" })
    .then(async (r) => {
      if (!r.ok) return null;
      const j = (await r.json().catch(() => null)) as { totpEnabled?: unknown } | null;
      if (!j || typeof j.totpEnabled !== "boolean") return null;
      cached = { at: Date.now(), totpEnabled: j.totpEnabled };
      return j.totpEnabled;
    })
    .catch(() => null)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export type TotpNeed = "loading" | "yes" | "no" | "unknown";

/** Status kebutuhan kode 2FA untuk dialog yang sedang `open`. `refresh()` memaksa ambil ulang (mis. setelah penolakan). */
export function useStepUpTotpNeed(open: boolean): { need: TotpNeed; refresh: () => void } {
  const [value, setValue] = useState<boolean | null | undefined>(undefined);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    fetchStatus(tick > 0).then((v) => alive && setValue(v));
    return () => {
      alive = false;
    };
  }, [open, tick]);

  const need: TotpNeed = value === undefined ? "loading" : value === null ? "unknown" : value ? "yes" : "no";
  return { need, refresh: () => setTick((n) => n + 1) };
}
