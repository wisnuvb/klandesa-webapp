/**
 * Autentikasi permintaan /api/v1 dengan kunci API: `Authorization: Bearer kld_…`.
 * Urutan: bentuk kunci → cari hash → belum dicabut/kedaluwarsa → langganan desa aktif → scope → batas laju.
 * Setiap pemakaian yang bisa diatribusikan ke desa dicatat di `api_access_logs` (dilihat kepala desa).
 */
import type { Village } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isVillageSubscriptionActive } from "@/lib/subscription";
import { API_KEY_PATTERN, hashApiKey, keyStatus } from "./keys";
import { FixedWindowLimiter } from "./rate-limit";
import { readScopes, type ApiScope } from "./scopes";

import { RATE_LIMIT_PER_MINUTE } from "./rate-limit-const";
export { RATE_LIMIT_PER_MINUTE };
export const ACCESS_LOG_RETENTION_DAYS = 90;
const limiter = new FixedWindowLimiter(RATE_LIMIT_PER_MINUTE, 60_000);
const lastUsedWritten = new Map<number, number>();

export interface ApiKeyContext {
  key: { id: number; name: string; prefix: string; scopes: ApiScope[]; expiresAt: Date | null };
  village: Village;
}

export type ApiKeyAuth =
  | { ok: true; ctx: ApiKeyContext; respond: (res: NextResponse) => NextResponse }
  | { ok: false; response: NextResponse };

const err = (status: number, code: string, message: string, headers?: Record<string, string>) =>
  NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store", ...headers } });

function clientIp(req: Request): string | null {
  return (req.headers.get("x-forwarded-for")?.split(",")[0] ?? "").trim().slice(0, 50) || null;
}

async function logAccess(req: Request, villageId: number, key: { id: number; prefix: string }, status: number): Promise<void> {
  try {
    await prisma.apiAccessLog.create({
      data: { villageId, apiKeyId: key.id, keyPrefix: key.prefix, method: req.method.slice(0, 10), path: new URL(req.url).pathname.slice(0, 200), status, ipAddress: clientIp(req) },
    });
    // Pembersihan ringan tanpa cron: sesekali buang log desa ini yang melewati masa simpan.
    if (Math.random() < 1 / 200) {
      await prisma.apiAccessLog.deleteMany({ where: { villageId, createdAt: { lt: new Date(Date.now() - ACCESS_LOG_RETENTION_DAYS * 86_400_000) } } });
    }
  } catch (e) {
    console.error("[api-keys] gagal mencatat akses:", e instanceof Error ? e.message : e);
  }
}

function touchLastUsed(keyId: number): void {
  const now = Date.now();
  if (now - (lastUsedWritten.get(keyId) ?? 0) < 60_000) return;
  lastUsedWritten.set(keyId, now);
  void prisma.apiKey.update({ where: { id: keyId }, data: { lastUsedAt: new Date(now) } }).catch(() => lastUsedWritten.delete(keyId));
}

/** `scope = null`: cukup kunci yang sah (dipakai endpoint identitas /api/v1/me). */
export async function requireApiKey(req: Request, scope: ApiScope | null): Promise<ApiKeyAuth> {
  const header = req.headers.get("authorization") ?? "";
  const secret = /^Bearer\s+(\S+)$/i.exec(header)?.[1];
  if (!secret || !API_KEY_PATTERN.test(secret)) {
    return { ok: false, response: err(401, "unauthorized", "Kunci API tidak ada atau tidak valid. Kirim header Authorization: Bearer <kunci>.", { "WWW-Authenticate": 'Bearer realm="klandesa"' }) };
  }

  const row = await prisma.apiKey.findUnique({ where: { keyHash: hashApiKey(secret) }, include: { village: true } });
  if (!row) return { ok: false, response: err(401, "unauthorized", "Kunci API tidak ada atau tidak valid.") };

  const key = { id: row.id, name: row.name, prefix: row.keyPrefix, scopes: readScopes(row.scopes), expiresAt: row.expiresAt };
  const deny = async (status: number, code: string, message: string, headers?: Record<string, string>) => {
    await logAccess(req, row.villageId, key, status);
    return { ok: false as const, response: err(status, code, message, headers) };
  };

  const st = keyStatus(row);
  if (st === "revoked") return deny(401, "key_revoked", "Kunci API ini sudah dicabut.");
  if (st === "expired") return deny(401, "key_expired", "Kunci API ini sudah kedaluwarsa. Buat kunci baru di Klandesa.");
  if (!row.village.isActive || !isVillageSubscriptionActive(row.village)) return deny(403, "subscription_inactive", "Langganan desa tidak aktif.");
  if (scope && !key.scopes.includes(scope)) return deny(403, "insufficient_scope", `Kunci ini tidak punya akses "${scope}".`);

  const rl = limiter.check(`k${row.id}`);
  if (!rl.allowed) return deny(429, "rate_limited", `Terlalu banyak permintaan. Coba lagi dalam ${rl.retryAfterSec} detik.`, { "Retry-After": String(rl.retryAfterSec) });

  touchLastUsed(row.id);
  return {
    ok: true,
    ctx: { key, village: row.village },
    respond: (res) => {
      res.headers.set("Cache-Control", "no-store");
      res.headers.set("X-RateLimit-Limit", String(RATE_LIMIT_PER_MINUTE));
      res.headers.set("X-RateLimit-Remaining", String(rl.remaining));
      void logAccess(req, row.villageId, key, res.status);
      return res;
    },
  };
}
