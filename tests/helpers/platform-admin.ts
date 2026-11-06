/**
 * Pembantu tes integrasi rute /api/admin/* (Paket E): sesi admin platform lewat JWT sungguhan + pembacaan jejak audit.
 * Pakai SETELAH `process.env.DATABASE_URL` diisi (impor dinamis di `before`).
 */
import assert from "node:assert/strict";
import { NextRequest } from "next/server";

export const SECRET = "uji-rahasia-admin-audit-0123456789abcdef";
export const DB_URL = process.env.KEP_TEST_DATABASE_URL;
const dbName = DB_URL ? new URL(DB_URL).pathname.replace(/^\//, "") : "";
export const dbEnabled = Boolean(DB_URL) && /scratch|test/i.test(dbName);
export const SKIP = dbEnabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch";

export type Prisma = typeof import("../../lib/prisma").prisma;

/** Sandi admin uji (hash sungguhan disimpan oleh `makeAdmin`) untuk konfirmasi sandi (`requireStepUp`). */
export const ADMIN_PW = "SandiAdminUji-98765";
export const STEP_UP_REASON = "Alasan uji otomatis nomor 123";

/** Lengkapi body mutasi berisiko dengan `confirmPassword` + `reason` yang benar. */
export function risky(body: unknown = {}, over: { confirmPassword?: unknown; reason?: unknown } = {}): Record<string, unknown> {
  return { ...(body && typeof body === "object" ? (body as Record<string, unknown>) : {}), confirmPassword: ADMIN_PW, reason: STEP_UP_REASON, ...over };
}

let pwHash: string | null = null;
async function adminPwHash(): Promise<string> {
  if (!pwHash) pwHash = await (await import("../../lib/auth")).hashPassword(ADMIN_PW);
  return pwHash;
}

let ipN = 0;

export async function setupEnv() {
  process.env.DATABASE_URL = DB_URL;
  process.env.AUTH_SECRET = SECRET;
  delete process.env.NEXTAUTH_URL;
  const { prisma } = await import("../../lib/prisma");
  const { encode } = await import("next-auth/jwt");
  return { prisma, encode };
}

export async function makeAdmin(
  prisma: Prisma,
  encode: typeof import("next-auth/jwt").encode,
  tag: string,
  role: "platform_admin" | "platform_support" = "platform_admin",
) {
  const user = await prisma.platformUser.create({ data: { email: `${tag}@uji.test`, password: await adminPwHash(), name: `Admin ${tag}`, role } });
  const cookie = await encode({
    secret: SECRET,
    token: { sub: `pl:${user.id}`, id: `pl:${user.id}`, accountType: "platform", role, email: user.email, name: user.name },
  });
  return { user, cookie };
}

export function call(
  handler: (req: NextRequest, ctx?: never) => Promise<Response>,
  method: string,
  path: string,
  cookie: string | null,
  body?: unknown,
  params?: Record<string, string>,
): Promise<Response> {
  const headers: Record<string, string> = { "x-real-ip": `10.9.${Math.floor(ipN / 250) % 250}.${(ipN++ % 250) + 1}` };
  if (cookie) headers.cookie = `next-auth.session-token=${cookie}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  const req = new NextRequest(`http://localhost${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const ctx = params ? { params: Promise.resolve(params) } : undefined;
  return (handler as unknown as (r: NextRequest, c?: unknown) => Promise<Response>)(req, ctx);
}

/** Jejak audit milik satu admin, terlama dulu. */
export async function auditOf(prisma: Prisma, actorId: number, action?: string) {
  return prisma.platformAuditLog.findMany({ where: { actorId, ...(action ? { action } : {}) }, orderBy: { id: "asc" } });
}

/** Tidak satu pun nilai rahasia boleh muncul di summary/metadata mana pun. */
export function assertNoSecrets(rows: { summary: string; metadata: unknown }[], secrets: string[]) {
  const blob = JSON.stringify(rows.map((r) => [r.summary, r.metadata]));
  for (const s of secrets) assert.ok(!blob.includes(s), `rahasia bocor ke jejak audit: ${s}`);
}
