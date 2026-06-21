/** Turnstile hanya aktif saat build/runtime production (`NODE_ENV=production`). */
export function isTurnstileProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Client: widget & validasi form wajib token. */
export function isTurnstileRequiredOnClient(): boolean {
  if (!isTurnstileProduction()) return false;
  return Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim());
}

/** Site key untuk widget — undefined di non-prod meski env terisi. */
export function getTurnstileSiteKey(): string | undefined {
  if (!isTurnstileProduction()) return undefined;
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  return key || undefined;
}
