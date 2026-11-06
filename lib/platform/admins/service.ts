import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkRateLimitDb, limiterKey } from "@/lib/mobile/rate-limit";
import { isEmailTakenAnywhere, unusablePasswordHash } from "@/lib/rbac/accounts";
import { sendTransactional } from "@/lib/email/send";
import { auditPlatform, auditPlatformStrict, type PlatformAuditActor } from "@/lib/platform/audit";
import { clearTotp } from "@/lib/platform/admins/two-factor";
import { clearAdminLocks } from "@/lib/platform/admins/login-guard";
import { platformInviteEmail, platformResetEmail } from "@/lib/platform/admins/emails";
import {
  PLATFORM_INVITE_TTL_MS,
  PLATFORM_RESET_TTL_MS,
  issuePlatformToken,
  platformAccessLink,
  type PlatformTokenPurpose,
} from "@/lib/platform/admins/tokens";

/** Logika kelola admin platform. Semua fungsi mengembalikan hasil (tidak melempar untuk kesalahan pengguna). */
export type Fail = { ok: false; status: number; error: string };
const fail = (status: number, error: string): Fail => ({ ok: false, status, error });

export type AdminListItem = {
  id: number;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  totpEnabled: boolean;
  lastLogin: string | null;
  createdAt: string;
  /** Ada undangan yang belum dipakai dan belum kedaluwarsa. */
  pendingInvite: boolean;
};

export async function listAdmins(now = new Date()): Promise<AdminListItem[]> {
  const rows = await prisma.platformUser.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    take: 100,
    select: { id: true, email: true, name: true, role: true, isActive: true, totpEnabledAt: true, lastLogin: true, createdAt: true },
  });
  const pending = rows.length
    ? await prisma.platformAuthToken.findMany({
        where: { platformUserId: { in: rows.map((r) => r.id) }, purpose: "INVITE", usedAt: null, expiresAt: { gt: now } },
        select: { platformUserId: true },
      })
    : [];
  const pendingSet = new Set(pending.map((p) => p.platformUserId));
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role,
    isActive: r.isActive,
    totpEnabled: r.totpEnabledAt != null,
    lastLogin: r.lastLogin?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    pendingInvite: pendingSet.has(r.id),
  }));
}

export type Delivery = { sent: boolean; reason?: string; manualLink?: string; expiresAt: string };

async function deliver(o: { to: string; purpose: PlatformTokenPurpose; token: string; expiresAt: Date; name: string; byEmail: string }): Promise<Delivery> {
  const link = platformAccessLink(o.token);
  const content =
    o.purpose === "INVITE"
      ? platformInviteEmail({ name: o.name, invitedBy: o.byEmail, link, expiresAt: o.expiresAt })
      : platformResetEmail({ name: o.name, byEmail: o.byEmail, link, expiresAt: o.expiresAt });
  const res = await sendTransactional({ template: o.purpose === "INVITE" ? "invite" : "reset", to: o.to, content, source: "admin" });
  // Tautan manual dikembalikan SEKALI hanya bila email gagal; tidak disimpan dan tidak dicatat.
  return res.ok
    ? { sent: true, expiresAt: o.expiresAt.toISOString() }
    : { sent: false, reason: res.reason, manualLink: link, expiresAt: o.expiresAt.toISOString() };
}

export async function inviteAdmin(
  req: Request,
  actor: PlatformAuditActor,
  input: { email: string; name: string; reason?: string },
): Promise<{ ok: true; admin: { id: number; email: string; name: string }; delivery: Delivery } | Fail> {
  const rl = await checkRateLimitDb(limiterKey("platform-invite", actor.platformUserId ?? 0), { max: 10, windowMs: 60 * 60_000 });
  if (!rl.ok) return fail(429, "Terlalu banyak undangan. Coba lagi nanti.");
  if (await isEmailTakenAnywhere(prisma, input.email)) return fail(409, "Email itu sudah dipakai oleh akun lain.");

  const password = await unusablePasswordHash();
  const created = await prisma
    .$transaction(async (tx) => {
      const u = await tx.platformUser.create({ data: { email: input.email, name: input.name, password, role: "platform_admin", isActive: true }, select: { id: true, email: true, name: true } });
      const t = await issuePlatformToken(tx, { platformUserId: u.id, purpose: "INVITE", ttlMs: PLATFORM_INVITE_TTL_MS, createdBy: actor.platformUserId });
      return { u, t };
    })
    .catch((e: { code?: string }) => (e?.code === "P2002" ? null : Promise.reject(e)));
  if (!created) return fail(409, "Email itu sudah dipakai oleh akun lain.");

  try {
    await auditPlatformStrict(req, actor, {
      action: "admin.invite",
      targetType: "platform_user",
      targetId: created.u.id,
      summary: `Mengundang admin platform ${created.u.email}.`,
      metadata: { email: created.u.email, name: created.u.name, ...(input.reason ? { reason: input.reason } : {}) },
    });
  } catch (e) {
    // Jejak gagal ditulis: batalkan akun yang baru dibuat (tautan belum pernah dikirim).
    await prisma.platformUser.delete({ where: { id: created.u.id } }).catch(() => undefined);
    throw e;
  }
  const delivery = await deliver({ to: created.u.email, purpose: "INVITE", token: created.t.token, expiresAt: created.t.expiresAt, name: created.u.name, byEmail: actor.email });
  return { ok: true, admin: created.u, delivery };
}

/** Kirim tautan atur ulang sandi (RESET) atau kirim ulang undangan (INVITE). Tidak pernah menetapkan/menampilkan sandi. */
export async function sendAdminAccessLink(
  req: Request,
  actor: PlatformAuditActor,
  targetId: number,
  purpose: PlatformTokenPurpose,
  reason: string,
): Promise<{ ok: true; delivery: Delivery } | Fail> {
  const target = await prisma.platformUser.findUnique({ where: { id: targetId }, select: { id: true, email: true, name: true, isActive: true } });
  if (!target) return fail(404, "Admin tidak ditemukan.");
  if (!target.isActive) return fail(409, "Akun admin ini nonaktif. Aktifkan dulu.");
  const rl = await checkRateLimitDb(limiterKey("platform-access-link", target.id), { max: 5, windowMs: 60 * 60_000 });
  if (!rl.ok) return fail(429, "Terlalu banyak tautan untuk akun ini. Coba lagi nanti.");

  await auditPlatformStrict(req, actor, {
    action: purpose === "INVITE" ? "admin.invite" : "admin.reset_link",
    targetType: "platform_user",
    targetId: target.id,
    summary: purpose === "INVITE" ? `Mengirim ulang undangan ke ${target.email}.` : `Mengirim tautan atur ulang sandi ke ${target.email}.`,
    metadata: { reason, ...(purpose === "INVITE" ? { resend: true } : {}) },
  });
  const t = await issuePlatformToken(prisma, { platformUserId: target.id, purpose, ttlMs: purpose === "INVITE" ? PLATFORM_INVITE_TTL_MS : PLATFORM_RESET_TTL_MS, createdBy: actor.platformUserId });
  const delivery = await deliver({ to: target.email, purpose, token: t.token, expiresAt: t.expiresAt, name: target.name, byEmail: actor.email });
  return { ok: true, delivery };
}

/**
 * Admin aktif lain yang BENAR-BENAR bisa masuk. Undangan yang belum pernah dipakai (akun bersandi acak tak diketahui, belum pernah
 * login, belum pernah menetapkan sandi) tidak dihitung: kalau dihitung, owner bisa menonaktifkan satu-satunya admin yang nyata dan
 * mengunci konsol. Penanda "belum menetapkan sandi" = ada jejak `admin.invite` untuk akun itu tanpa `admin.password_change` dan `lastLogin` kosong.
 */
async function countLoginCapableOthers(tx: Prisma.TransactionClient, targetId: number, scope?: Prisma.PlatformUserWhereInput): Promise<number> {
  const others = await tx.platformUser.findMany({
    where: { AND: [{ isActive: true, id: { not: targetId } }, scope ?? {}] },
    select: { id: true, lastLogin: true },
    take: 500,
  });
  const neverLoggedIn = others.filter((u) => !u.lastLogin).map((u) => String(u.id));
  if (neverLoggedIn.length === 0) return others.length;
  const [invited, passwordSet] = await Promise.all([
    tx.platformAuditLog.findMany({ where: { action: "admin.invite", targetType: "platform_user", targetId: { in: neverLoggedIn } }, select: { targetId: true }, distinct: ["targetId"] }),
    tx.platformAuditLog.findMany({ where: { action: "admin.password_change", targetType: "platform_user", targetId: { in: neverLoggedIn } }, select: { targetId: true }, distinct: ["targetId"] }),
  ]);
  const set = new Set(passwordSet.map((r) => r.targetId));
  const stuck = invited.filter((r) => !set.has(r.targetId)).length;
  return others.length - stuck;
}

/**
 * Nonaktifkan/aktifkan. Aturan #8: tidak boleh menonaktifkan diri sendiri dan tidak boleh menonaktifkan admin aktif TERAKHIR.
 * Hitungan dilakukan dalam transaksi dengan mengunci baris admin aktif supaya dua penonaktifan bersamaan tak lolos.
 */
export async function setAdminActive(
  req: Request,
  actor: PlatformAuditActor,
  targetId: number,
  active: boolean,
  reason: string,
  /** `scope` mempersempit himpunan admin yang dihitung untuk aturan "admin aktif terakhir" (hanya untuk tes; bawaan: semua admin). */
  o: { scope?: Prisma.PlatformUserWhereInput } = {},
): Promise<{ ok: true } | Fail> {
  if (!active && actor.platformUserId === targetId) return fail(400, "Anda tidak bisa menonaktifkan akun Anda sendiri.");
  const outcome = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM platform_users WHERE isActive = 1 FOR UPDATE`;
    const target = await tx.platformUser.findUnique({ where: { id: targetId }, select: { id: true, email: true, isActive: true } });
    if (!target) return fail(404, "Admin tidak ditemukan.");
    if (target.isActive === active) return fail(409, active ? "Akun sudah aktif." : "Akun sudah nonaktif.");
    if (!active) {
      const others = await countLoginCapableOthers(tx, targetId, o.scope);
      if (others < 1) return fail(409, "Tidak bisa menonaktifkan admin platform aktif terakhir.");
    }
    await tx.platformUser.update({ where: { id: targetId }, data: { isActive: active, ...(active ? {} : { sessionVersion: { increment: 1 } }) } });
    if (!active) await tx.platformAuthToken.updateMany({ where: { platformUserId: targetId, usedAt: null }, data: { usedAt: new Date() } });
    return { ok: true as const, email: target.email };
  });
  if (!outcome.ok) return outcome;
  await auditPlatform(req, actor, {
    action: active ? "admin.activate" : "admin.deactivate",
    targetType: "platform_user",
    targetId,
    summary: `${active ? "Mengaktifkan" : "Menonaktifkan"} admin platform ${outcome.email}.`,
    metadata: { reason },
  });
  return { ok: true };
}

export async function forceLogoutAdmin(req: Request, actor: PlatformAuditActor, targetId: number, reason: string): Promise<{ ok: true } | Fail> {
  const target = await prisma.platformUser.findUnique({ where: { id: targetId }, select: { id: true, email: true } });
  if (!target) return fail(404, "Admin tidak ditemukan.");
  await prisma.platformUser.update({ where: { id: targetId }, data: { sessionVersion: { increment: 1 } } });
  await auditPlatform(req, actor, {
    action: "admin.force_logout",
    targetType: "platform_user",
    targetId,
    summary: `Memaksa keluar semua sesi admin ${target.email}.`,
    metadata: { reason, self: actor.platformUserId === targetId },
  });
  return { ok: true };
}

/** Reset 2FA admin LAIN (kehilangan perangkat). Mencabut semua sesinya. Untuk akun sendiri pakai "Nonaktifkan 2FA". */
export async function resetAdminTwoFactor(req: Request, actor: PlatformAuditActor, targetId: number, reason: string): Promise<{ ok: true } | Fail> {
  if (actor.platformUserId === targetId) return fail(400, "Untuk akun Anda sendiri, nonaktifkan 2FA lewat halaman Keamanan.");
  const target = await prisma.platformUser.findUnique({ where: { id: targetId }, select: { id: true, email: true, totpSecretEnc: true, totpEnabledAt: true } });
  if (!target) return fail(404, "Admin tidak ditemukan.");
  if (!target.totpEnabledAt && !target.totpSecretEnc) return fail(409, "Admin ini belum mengaktifkan 2FA.");
  await auditPlatformStrict(req, actor, {
    action: "admin.2fa_reset",
    targetType: "platform_user",
    targetId,
    summary: `Mereset 2FA admin ${target.email} (sesi dicabut).`,
    metadata: { reason },
  });
  await clearTotp(targetId, { revokeSessions: true });
  return { ok: true };
}

/**
 * Buka kunci login admin LAIN (atau diri sendiri bila masih bisa masuk): hapus pembatas kegagalan 2FA, login, step-up, dan pembatas
 * login per-email. Pembatas per-IP dan per-IP+email memuat IP (tidak bisa dihitung ulang) dan hangus sendiri dalam 10-15 menit.
 * Ini jalan keluar bila pihak lain yang tahu sandi (atau penyerang tanpa kode) menghabiskan jatah kode 2FA sehingga admin sah ditolak 429.
 */
export async function unlockAdmin(req: Request, actor: PlatformAuditActor, targetId: number, reason: string): Promise<{ ok: true; cleared: number } | Fail> {
  const target = await prisma.platformUser.findUnique({ where: { id: targetId }, select: { id: true, email: true } });
  if (!target) return fail(404, "Admin tidak ditemukan.");
  const cleared = await clearAdminLocks(target.id, target.email);
  await auditPlatform(req, actor, {
    action: "admin.unlock",
    targetType: "platform_user",
    targetId,
    summary: `Membuka kunci login admin ${target.email} (pembatas 2FA/login/konfirmasi sandi dihapus).`,
    metadata: { reason, cleared, self: actor.platformUserId === targetId },
  });
  return { ok: true, cleared };
}
