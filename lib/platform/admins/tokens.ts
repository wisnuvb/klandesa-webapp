import { createHash, randomBytes } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { getAppOrigin } from "@/lib/email/app-origin";

type Db = PrismaClient | Prisma.TransactionClient;

/** Tautan sekali pakai admin platform. Hanya hash SHA-256 token yang disimpan (tabel `platform_auth_tokens`). */
export type PlatformTokenPurpose = "INVITE" | "RESET";
export const PLATFORM_INVITE_TTL_MS = 72 * 60 * 60 * 1000;
export const PLATFORM_RESET_TTL_MS = 24 * 60 * 60 * 1000;

export const hashPlatformToken = (raw: string) => createHash("sha256").update(raw).digest("hex");
const TOKEN_RE = /^[A-Za-z0-9_-]{20,128}$/;

/** Menerbitkan token baru; token lama yang belum terpakai untuk akun yang sama dicabut (hanya satu tautan hidup). */
export async function issuePlatformToken(
  db: Db,
  o: { platformUserId: number; purpose: PlatformTokenPurpose; ttlMs: number; createdBy?: number | null; now?: Date },
): Promise<{ token: string; expiresAt: Date }> {
  const now = o.now ?? new Date();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + o.ttlMs);
  await db.platformAuthToken.updateMany({ where: { platformUserId: o.platformUserId, usedAt: null }, data: { usedAt: now } });
  await db.platformAuthToken.create({
    data: { platformUserId: o.platformUserId, purpose: o.purpose, tokenHash: hashPlatformToken(token), expiresAt, createdByPlatformUserId: o.createdBy ?? null },
  });
  return { token, expiresAt };
}

export type PlatformTokenView = { platformUserId: number; purpose: PlatformTokenPurpose; expiresAt: Date; email: string; name: string; isActive: boolean };

/** Lihat token tanpa memakainya. Null bila tak ada/kedaluwarsa/terpakai. */
export async function peekPlatformToken(db: Db, raw: string, now = new Date()): Promise<PlatformTokenView | null> {
  if (!TOKEN_RE.test(raw)) return null;
  const row = await db.platformAuthToken.findUnique({
    where: { tokenHash: hashPlatformToken(raw) },
    select: { purpose: true, expiresAt: true, usedAt: true, platformUser: { select: { id: true, email: true, name: true, isActive: true } } },
  });
  if (!row || row.usedAt || row.expiresAt <= now) return null;
  return { platformUserId: row.platformUser.id, purpose: row.purpose as PlatformTokenPurpose, expiresAt: row.expiresAt, email: row.platformUser.email, name: row.platformUser.name, isActive: row.platformUser.isActive };
}

/** Pakai token secara ATOMIK (satu pemenang bila dua permintaan bersamaan). */
export async function consumePlatformToken(db: Db, raw: string, now = new Date()): Promise<{ platformUserId: number; purpose: PlatformTokenPurpose } | null> {
  if (!TOKEN_RE.test(raw)) return null;
  const hash = hashPlatformToken(raw);
  const claimed = await db.platformAuthToken.updateMany({ where: { tokenHash: hash, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } });
  if (claimed.count !== 1) return null;
  const row = await db.platformAuthToken.findUnique({ where: { tokenHash: hash }, select: { platformUserId: true, purpose: true } });
  return row ? { platformUserId: row.platformUserId, purpose: row.purpose as PlatformTokenPurpose } : null;
}

/** Token di FRAGMEN (#token=): tidak dikirim peramban ke server, jadi tidak masuk log akses proxy. Halaman membacanya di klien. */
export function platformAccessLink(token: string): string {
  return `${getAppOrigin()}/auth/atur-sandi-admin#token=${encodeURIComponent(token)}`;
}
