import { createHash, timingSafeEqual } from "node:crypto";
import { getCronSecret } from "./config";

/** Bandingkan header Authorization dengan `Bearer $CRON_SECRET` tanpa bocor panjang/isi lewat waktu respons. */
export function isValidCronAuth(authorization: string | null | undefined, secret: string | null = getCronSecret()): boolean {
  if (!secret || !authorization) return false;
  const a = createHash("sha256").update(authorization.trim()).digest();
  const b = createHash("sha256").update(`Bearer ${secret}`).digest();
  return timingSafeEqual(a, b);
}
