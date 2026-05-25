"use client";

const REFERRAL_STORAGE_KEY = "klandesa.referralCode";

export function normalizeClientReferralCode(value: unknown): string | null {
  const code = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "");
  return code ? code.slice(0, 40) : null;
}

export function captureReferralFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const code = normalizeClientReferralCode(url.searchParams.get("ref"));
  if (!code) return getStoredReferralCode();
  window.localStorage.setItem(REFERRAL_STORAGE_KEY, code);
  void trackReferralClient("page_view", {
    refCode: code,
    sourcePath: `${url.pathname}${url.search}`,
  });
  return code;
}

export function getStoredReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  return normalizeClientReferralCode(window.localStorage.getItem(REFERRAL_STORAGE_KEY));
}

/**
 * Kode referral untuk aksi klien: prioritas `ref` di URL, lalu localStorage.
 * Jika ada di URL, disimpan ke localStorage tanpa memicu event `page_view`
 * (beda dengan `captureReferralFromUrl`).
 */
export function getEffectiveReferralCode(refQueryParam: string | null | undefined): string | null {
  const fromUrl = normalizeClientReferralCode(refQueryParam);
  if (fromUrl) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(REFERRAL_STORAGE_KEY, fromUrl);
    }
    return fromUrl;
  }
  return getStoredReferralCode();
}

export async function trackReferralClient(
  action: string,
  payload: {
    refCode?: string | null;
    sourcePath?: string | null;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    villageName?: string | null;
    subject?: string | null;
    metadata?: Record<string, unknown>;
  } = {},
) {
  const refCode = normalizeClientReferralCode(payload.refCode) || getStoredReferralCode();
  if (!refCode) return;

  await fetch("/api/referrals/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      refCode,
      action,
      sourcePath:
        payload.sourcePath ||
        (typeof window === "undefined"
          ? null
          : `${window.location.pathname}${window.location.search}`),
    }),
    keepalive: true,
  }).catch(() => null);
}
