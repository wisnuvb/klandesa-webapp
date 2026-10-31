/** Pembuatan, pencabutan, dan daftar kunci API. Rahasia kunci hanya ada di respons pembuatan; DB menyimpan hash-nya. */
import { createHash, randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { readScopes, type ApiScope } from "./scopes";

type Db = Prisma.TransactionClient;

/** Bentuk kunci: "kld_" + 40 karakter base64url (240 bit acak). Pemeriksaan bentuk menolak sampah sebelum menyentuh DB. */
export const API_KEY_PATTERN = /^kld_[A-Za-z0-9_-]{40}$/;
export const MAX_ACTIVE_KEYS_PER_VILLAGE = 10;
export const EXPIRY_CHOICES_DAYS = [30, 90, 365] as const;

export const hashApiKey = (secret: string): string => createHash("sha256").update(secret).digest("hex");

export function generateApiKey(): { secret: string; prefix: string; hash: string } {
  const secret = `kld_${randomBytes(30).toString("base64url")}`;
  return { secret, prefix: secret.slice(0, 12), hash: hashApiKey(secret) };
}

export type KeyStatus = "active" | "expired" | "revoked";

export interface ApiKeyView {
  id: number;
  name: string;
  prefix: string;
  scopes: ApiScope[];
  status: KeyStatus;
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export const keyStatus = (k: { revokedAt: Date | null; expiresAt: Date | null }, now: Date = new Date()): KeyStatus =>
  k.revokedAt ? "revoked" : k.expiresAt && k.expiresAt.getTime() <= now.getTime() ? "expired" : "active";

export type CreateResult =
  | { ok: true; secret: string; key: ApiKeyView }
  | { ok: false; status: number; error: string };

export async function createApiKey(
  db: Db,
  a: { villageId: number; userId: number | null; name: string; scopes: ApiScope[]; expiresInDays: number | null; now?: Date },
): Promise<CreateResult> {
  const now = a.now ?? new Date();
  const name = a.name.trim().replace(/\s+/g, " ");
  if (!name) return { ok: false, status: 422, error: "Nama kunci wajib diisi." };
  if (name.length > 100) return { ok: false, status: 422, error: "Nama kunci maksimal 100 karakter." };
  if (a.expiresInDays != null && !(EXPIRY_CHOICES_DAYS as readonly number[]).includes(a.expiresInDays)) {
    return { ok: false, status: 422, error: "Masa berlaku tidak valid." };
  }

  const active = await db.apiKey.count({ where: { villageId: a.villageId, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } });
  if (active >= MAX_ACTIVE_KEYS_PER_VILLAGE) {
    return { ok: false, status: 409, error: `Maksimal ${MAX_ACTIVE_KEYS_PER_VILLAGE} kunci aktif. Cabut kunci yang tidak dipakai dulu.` };
  }

  const { secret, prefix, hash } = generateApiKey();
  const expiresAt = a.expiresInDays != null ? new Date(now.getTime() + a.expiresInDays * 86_400_000) : null;
  const row = await db.apiKey.create({
    data: { villageId: a.villageId, name, keyPrefix: prefix, keyHash: hash, scopes: a.scopes, createdById: a.userId, expiresAt },
  });
  return { ok: true, secret, key: toView(row, now) };
}

type Row = { id: number; name: string; keyPrefix: string; scopes: unknown; createdAt: Date; expiresAt: Date | null; lastUsedAt: Date | null; revokedAt: Date | null };
const toView = (r: Row, now: Date = new Date()): ApiKeyView => ({
  id: r.id,
  name: r.name,
  prefix: r.keyPrefix,
  scopes: readScopes(r.scopes),
  status: keyStatus(r, now),
  createdAt: r.createdAt.toISOString(),
  expiresAt: r.expiresAt?.toISOString() ?? null,
  lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
  revokedAt: r.revokedAt?.toISOString() ?? null,
});

export async function listApiKeys(db: Db, villageId: number): Promise<ApiKeyView[]> {
  const rows = await db.apiKey.findMany({ where: { villageId }, orderBy: { id: "desc" } });
  return rows.map((r) => toView(r));
}

/** Cabut kunci (tidak dihapus: jejak tetap ada). Mengembalikan false bila tidak ada / sudah dicabut / milik desa lain. */
export async function revokeApiKey(db: Db, a: { villageId: number; id: number; userId: number | null }): Promise<boolean> {
  const r = await db.apiKey.updateMany({ where: { id: a.id, villageId: a.villageId, revokedAt: null }, data: { revokedAt: new Date(), revokedById: a.userId } });
  return r.count === 1;
}
