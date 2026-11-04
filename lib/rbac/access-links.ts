import { createHash, randomBytes } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { getAppOrigin } from "@/lib/email/app-origin";
import { sendTransactional, type SendResult } from "@/lib/email/send";
import { checkRateLimitDb, limiterKey } from "@/lib/mobile/rate-limit";
import { inviteEmail, resetEmail } from "@/lib/email/templates";

type Db = PrismaClient | Prisma.TransactionClient;

export type TokenPurpose = "INVITE" | "RESET";
export const INVITE_TTL_MS = 72 * 60 * 60 * 1000;
export const ADMIN_RESET_TTL_MS = 24 * 60 * 60 * 1000;
export const SELF_RESET_TTL_MS = 60 * 60 * 1000;
/** Batas email undangan/atur ulang yang dipicu admin, per desa per jam. */
export const ADMIN_SENDS_PER_HOUR = 20;

export const hashToken = (raw: string) => createHash("sha256").update(raw).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");

/** Token mentah hanya ada di tautan email; DB hanya menyimpan hash. Token lama yang belum dipakai untuk tujuan sama dicabut. */
export async function issueAuthToken(
  db: Db,
  o: { userId: number; purpose: TokenPurpose; ttlMs: number; createdByUserId?: number | null; now?: Date; revokePrevious?: boolean },
): Promise<{ token: string; expiresAt: Date }> {
  const now = o.now ?? new Date();
  const token = newToken();
  const expiresAt = new Date(now.getTime() + o.ttlMs);
  // Penerbitan oleh admin mencabut tautan lama. Permintaan publik ("lupa sandi") TIDAK: orang lain tak boleh bisa mematikan tautan
  // yang baru dikirim ke korban. Semua tautan yang tersisa tetap hangus begitu salah satunya dipakai (lihat atur-sandi).
  if (o.revokePrevious !== false) {
    await db.authToken.updateMany({ where: { userId: o.userId, purpose: o.purpose, usedAt: null }, data: { usedAt: now } });
  }
  await db.authToken.create({
    data: { userId: o.userId, purpose: o.purpose, tokenHash: hashToken(token), expiresAt, createdByUserId: o.createdByUserId ?? null },
  });
  return { token, expiresAt };
}

export type TokenView = { userId: number; purpose: TokenPurpose; expiresAt: Date; email: string; name: string; isActive: boolean };

/** Lihat token tanpa memakainya (untuk menampilkan formulir). Null bila tak ada/kedaluwarsa/terpakai. */
export async function peekAuthToken(db: Db, raw: string, now = new Date()): Promise<TokenView | null> {
  if (!/^[A-Za-z0-9_-]{20,128}$/.test(raw)) return null;
  const row = await db.authToken.findUnique({
    where: { tokenHash: hashToken(raw) },
    select: { purpose: true, expiresAt: true, usedAt: true, user: { select: { id: true, email: true, name: true, isActive: true } } },
  });
  if (!row || row.usedAt || row.expiresAt <= now) return null;
  return { userId: row.user.id, purpose: row.purpose as TokenPurpose, expiresAt: row.expiresAt, email: row.user.email, name: row.user.name, isActive: row.user.isActive };
}

/** Pakai token secara ATOMIK (satu pemenang bila dua permintaan bersamaan). Mengembalikan userId bila berhasil. */
export async function consumeAuthToken(db: Db, raw: string, now = new Date()): Promise<{ userId: number; purpose: TokenPurpose } | null> {
  if (!/^[A-Za-z0-9_-]{20,128}$/.test(raw)) return null;
  const hash = hashToken(raw);
  const claimed = await db.authToken.updateMany({ where: { tokenHash: hash, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } });
  if (claimed.count !== 1) return null;
  const row = await db.authToken.findUnique({ where: { tokenHash: hash }, select: { userId: true, purpose: true } });
  return row ? { userId: row.userId, purpose: row.purpose as TokenPurpose } : null;
}

export function accessLink(token: string): string {
  return `${getAppOrigin()}/auth/atur-sandi?token=${encodeURIComponent(token)}`;
}

export function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  return `${local.slice(0, 1)}${"*".repeat(Math.max(2, Math.min(6, local.length - 1)))}@${domain}`;
}

export type Delivery = {
  /** Email berhasil diserahkan ke Brevo. */
  sent: boolean;
  reason?: Extract<SendResult, { ok: false }>["reason"] | "rate-limit";
  error?: string;
  /** Hanya bila email TIDAK terkirim: tautan untuk disampaikan admin secara manual. Jangan simpan/log. */
  manualLink?: string;
  expiresAt: Date;
};

/**
 * Terbitkan token lalu kirim email undangan/atur ulang. Bila email gagal (Brevo belum dikonfigurasi, kuota habis, dll),
 * tautan dikembalikan agar admin bisa menyampaikannya sendiri — undangan tidak pernah "hilang".
 */
export async function deliverAccessLink(
  db: PrismaClient,
  o: { userId: number; purpose: TokenPurpose; byAdmin: boolean; invitedBy?: string | null; dedupeMs?: number; ttlMs?: number; createdByUserId?: number | null },
): Promise<Delivery | null> {
  const user = await db.user.findUnique({ where: { id: o.userId }, select: { id: true, villageId: true, name: true, email: true, isActive: true, village: { select: { name: true } } } });
  if (!user || !user.isActive) return null;
  const ttlMs = o.ttlMs ?? (o.purpose === "INVITE" ? INVITE_TTL_MS : o.byAdmin ? ADMIN_RESET_TTL_MS : SELF_RESET_TTL_MS);
  if (o.byAdmin) {
    // Satu desa (mis. desa percobaan hasil daftar sendiri) tidak boleh mengirim email tanpa batas ke alamat pilihannya
    // dan menghabiskan kuota seluruh platform. Terbit token pun ditahan: tak ada tautan, tak ada email.
    const rl = await checkRateLimitDb(limiterKey("access-link-village", user.villageId), { max: ADMIN_SENDS_PER_HOUR, windowMs: 60 * 60_000 });
    if (!rl.ok) return { sent: false, reason: "rate-limit", expiresAt: new Date(Date.now() + ttlMs) };
  }
  const { token, expiresAt } = await issueAuthToken(db, { userId: user.id, purpose: o.purpose, ttlMs, createdByUserId: o.createdByUserId, revokePrevious: o.byAdmin });
  const link = accessLink(token);
  const content =
    o.purpose === "INVITE"
      ? inviteEmail({ name: user.name, villageName: user.village.name, invitedBy: o.invitedBy, link, expiresAt })
      : resetEmail({ name: user.name, link, expiresAt, byAdmin: o.byAdmin });
  const res = await sendTransactional({ template: o.purpose === "INVITE" ? "invite" : "reset", to: user.email, content, dedupeMs: o.dedupeMs, source: o.byAdmin ? "admin" : "public" });
  if (res.ok) return { sent: true, expiresAt };
  return { sent: false, reason: res.reason, error: res.error, manualLink: link, expiresAt };
}
