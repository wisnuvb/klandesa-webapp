import { createHmac, timingSafeEqual } from "crypto";
import { getResolvedAuthSecret } from "@/lib/auth-secret";
import { getMainSiteOrigin, joinUrl } from "@/lib/seo/url";

/**
 * Token verifikasi surat untuk QR di PDF. Tanpa kolom DB baru: `<id base36>.<tanda tangan HMAC>`.
 * Kunci diturunkan dari AUTH_SECRET dengan label khusus, jadi token ini tidak bisa dipakai untuk hal lain.
 */
function key(): string {
  const base = getResolvedAuthSecret();
  if (!base) throw new Error("AUTH_SECRET belum diset");
  return createHmac("sha256", base).update("klandesa-letter-verify-v1").digest("hex");
}

function sign(id: bigint): string {
  return createHmac("sha256", key()).update(`mail_service:${id.toString()}`).digest("base64url").slice(0, 22);
}

export function signLetterToken(mailServiceId: bigint | number): string {
  const id = BigInt(mailServiceId);
  return `${id.toString(36)}.${sign(id)}`;
}

/** Mengembalikan id surat bila token sah; null untuk apa pun yang cacat atau dipalsukan. */
export function parseLetterToken(token: unknown): bigint | null {
  if (typeof token !== "string" || token.length > 64) return null;
  const m = /^([0-9a-z]{1,16})\.([A-Za-z0-9_-]{22})$/.exec(token);
  if (!m) return null;
  let id: bigint;
  try {
    id = BigInt(parseInt(m[1], 36));
    if (id <= BigInt(0) || m[1] !== id.toString(36)) return null;
    const expected = Buffer.from(sign(id));
    const given = Buffer.from(m[2]);
    return expected.length === given.length && timingSafeEqual(expected, given) ? id : null;
  } catch {
    return null;
  }
}

export function letterVerifyUrl(token: string): string {
  return joinUrl(getMainSiteOrigin(), `/verifikasi-surat/${token}`);
}

/** "Siti Aminah" → "S*** A***": cukup untuk mencocokkan dengan pemohon tanpa membuka nama lengkap ke publik. */
export function maskPersonName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .map((w) => `${Array.from(w)[0]?.toUpperCase() ?? ""}***`)
    .join(" ");
}
