/**
 * Satu sumber untuk secret JWT/cookie NextAuth (harus sama di auth.ts dan middleware Edge).
 */
export function getResolvedAuthSecret(): string {
  const fromEnv = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "";
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV !== "production") {
    return "__dev_only_nextauth_secret_min_32_chars_static__";
  }
  return "";
}
