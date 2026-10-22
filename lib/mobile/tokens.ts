import { createHash, createHmac, randomBytes, randomUUID } from "crypto";
import * as jwt from "jsonwebtoken";
import { getResolvedAuthSecret } from "@/lib/auth-secret";

export const MOBILE_ACCESS_TTL_SEC = 15 * 60;
export const MOBILE_REFRESH_TTL_MS = 60 * 24 * 60 * 60 * 1000;
const AUDIENCE = "klandesa-mobile";

export type MobileAccountType = "staff" | "citizen";

export type MobileAccessClaims = {
  /** "staff:12" | "citizen:34" */
  sub: string;
  t: MobileAccountType;
  id: number;
  villageId: number;
  role: string;
};

/**
 * Kunci penandatangan token mobile diturunkan dari AUTH_SECRET lewat HMAC dengan label khusus,
 * sehingga token mobile tidak pernah valid sebagai JWT web/NextAuth (dan sebaliknya) meski audience-nya diabaikan.
 */
function secret(): string {
  const base = getResolvedAuthSecret();
  if (!base) throw new Error("AUTH_SECRET belum diset");
  return createHmac("sha256", base).update("klandesa-mobile-access-token-v1").digest("hex");
}

export function signMobileAccessToken(
  claims: Omit<MobileAccessClaims, "sub">,
  nowSec = Math.floor(Date.now() / 1000),
): string {
  const payload: MobileAccessClaims = { ...claims, sub: `${claims.t}:${claims.id}` };
  return jwt.sign({ ...payload, iat: nowSec }, secret(), {
    algorithm: "HS256",
    audience: AUDIENCE,
    expiresIn: MOBILE_ACCESS_TTL_SEC,
  });
}

export function verifyMobileAccessToken(token: string): MobileAccessClaims | null {
  try {
    const decoded = jwt.verify(token, secret(), {
      algorithms: ["HS256"],
      audience: AUDIENCE,
    });
    if (typeof decoded === "string") return null;
    const { t, id, villageId, role, sub } = decoded as Partial<MobileAccessClaims>;
    if ((t !== "staff" && t !== "citizen") || !Number.isInteger(id) || !Number.isInteger(villageId)) {
      return null;
    }
    if (typeof role !== "string" || typeof sub !== "string") return null;
    return { t, id: id as number, villageId: villageId as number, role, sub };
  } catch {
    return null;
  }
}

export function newRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newSessionFamilyId(): string {
  return randomUUID();
}

export function readBearer(header: string | null | undefined): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  return m ? m[1]!.trim() : null;
}
