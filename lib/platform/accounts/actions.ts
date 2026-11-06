import { Prisma, type PrismaClient } from "@prisma/client";
import { deliverAccessLink } from "@/lib/rbac/access-links";
import { isEmailTakenAnywhere, normalizeAccountEmail } from "@/lib/rbac/accounts";
import { checkRateLimitDb, limiterKey } from "@/lib/mobile/rate-limit";
import { generateActivationCode, hashActivationCode, normalizeActivationCode } from "@/lib/mobile/citizen";
import type { PlatformAuditEntry } from "@/lib/platform/audit";
import { applyAiCredits } from "./ai-credits";
import { maskEmail, maskedEmailChange } from "./mask";
import { auditRef, parseAiCreditsInput, type AccountKind } from "./validate";

/**
 * Logika aksi intervensi akun (Pusat Akun). Tidak tahu soal HTTP: rute memanggil `runAccountAction` setelah sesi + step-up + alasan
 * lolos, dan menyuntikkan penulis jejak audit. ATURAN: respons/metadata audit tidak boleh memuat sandi, token, tautan, hash, NIK utuh.
 */
export type ActionResult<T = Record<string, unknown>> = { ok: true; data: T } | { ok: false; status: number; error: string; code?: string };
const fail = (status: number, error: string, code?: string): { ok: false; status: number; error: string; code?: string } => ({ ok: false, status, error, code });
const ok = <T extends Record<string, unknown>>(data: T): ActionResult<T> => ({ ok: true, data });

export type ActionCtx = {
  db: PrismaClient;
  reason: string;
  /** Catat; kegagalan tidak membatalkan aksi. */
  audit: (entry: PlatformAuditEntry) => Promise<boolean>;
  /** Catat; melempar bila gagal (dipanggil SEBELUM efek yang mengeluarkan akses). */
  auditStrict: (entry: PlatformAuditEntry) => Promise<void>;
};

export const ACTIONS_BY_KIND: Record<AccountKind, readonly string[]> = {
  staff: ["reset-link", "deactivate", "activate", "force-logout", "change-email", "ai-credits", "unlock"],
  citizen: ["reset-code", "deactivate", "activate", "force-logout", "unlock"],
};

// ───────────────────────────── Sesi ─────────────────────────────

/** Cabut sesi web (sessionVersion++) dan semua sesi/refresh token mobile akun staf. Mengembalikan jumlah sesi mobile yang dicabut. */
export async function revokeStaffSessions(db: Prisma.TransactionClient, userId: number, now = new Date()): Promise<number> {
  await db.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } });
  const r = await db.mobileSession.updateMany({ where: { accountType: "staff", accountId: userId, revokedAt: null }, data: { revokedAt: now } });
  return r.count;
}

/** Warga hanya punya sesi mobile (tanpa sesi web). Sama dengan `setCitizenPassword` di lib/mobile/citizen-login. */
export async function revokeCitizenSessions(db: Prisma.TransactionClient, accountId: number, now = new Date()): Promise<number> {
  const r = await db.mobileSession.updateMany({ where: { accountType: "citizen", accountId, revokedAt: null }, data: { revokedAt: now } });
  return r.count;
}

// ───────────────────────────── Target ─────────────────────────────

const staffSelect = { id: true, villageId: true, email: true, name: true, role: true, isActive: true } satisfies Prisma.UserSelect;
const citizenSelect = {
  id: true, villageId: true, username: true, status: true, deletedAt: true, residentId: true,
  resident: { select: { nik: true } },
} satisfies Prisma.CitizenAccountSelect;

type Staff = Prisma.UserGetPayload<{ select: typeof staffSelect }>;
type Citizen = Prisma.CitizenAccountGetPayload<{ select: typeof citizenSelect }>;

const NOT_FOUND = fail(404, "Akun tidak ditemukan.");

// ───────────────────────────── Dispatcher ─────────────────────────────

export async function runAccountAction(ctx: ActionCtx, kind: AccountKind, id: number, action: string, body: Record<string, unknown>): Promise<ActionResult> {
  if (!ACTIONS_BY_KIND[kind].includes(action)) return fail(404, "Aksi tidak dikenal untuk jenis akun ini.");
  if (kind === "staff") {
    const t = await ctx.db.user.findUnique({ where: { id }, select: staffSelect });
    if (!t) return NOT_FOUND;
    switch (action) {
      case "reset-link": return staffResetLink(ctx, t);
      case "deactivate": return staffDeactivate(ctx, t, body.force === true);
      case "activate": return staffActivate(ctx, t);
      case "force-logout": return staffForceLogout(ctx, t);
      case "change-email": return staffChangeEmail(ctx, t, body.newEmail);
      case "ai-credits": return staffAiCredits(ctx, t, body);
      case "unlock": return staffUnlock(ctx, t);
    }
  } else {
    const t = await ctx.db.citizenAccount.findUnique({ where: { id }, select: citizenSelect });
    if (!t) return NOT_FOUND;
    if (t.deletedAt) return fail(409, "Akun warga ini sudah dihapus.");
    switch (action) {
      case "reset-code": return citizenResetCode(ctx, t);
      case "deactivate": return citizenDeactivate(ctx, t);
      case "activate": return citizenActivate(ctx, t);
      case "force-logout": return citizenForceLogout(ctx, t);
      case "unlock": return citizenUnlock(ctx, t);
    }
  }
  return fail(404, "Aksi tidak dikenal.");
}

// ───────────────────────────── Staf ─────────────────────────────

async function staffResetLink(ctx: ActionCtx, t: Staff): Promise<ActionResult> {
  if (!t.isActive) return fail(409, "Akun nonaktif: aktifkan dulu sebelum mengirim tautan atur sandi.", "ACCOUNT_INACTIVE");
  const ref = auditRef("staff", t.id);
  // Jejak dulu (ketat): tautan yang mengeluarkan akses tidak boleh terbit tanpa catatan.
  await ctx.auditStrict({
    action: "account.reset_link", ...ref, villageId: t.villageId,
    summary: `Menerbitkan tautan atur sandi untuk ${maskEmail(t.email)}`,
    metadata: { reason: ctx.reason, accountType: "staff", email: maskEmail(t.email) },
  });
  const d = await deliverAccessLink(ctx.db, { userId: t.id, purpose: "RESET", byAdmin: true, createdByUserId: null });
  if (!d) return fail(409, "Akun tidak aktif atau tidak ditemukan.");
  if (d.reason === "rate-limit") {
    return fail(429, "Batas pengiriman tautan untuk desa ini tercapai (20 per jam). Coba lagi nanti.", "RATE_LIMITED");
  }
  await ctx.audit({
    action: "account.reset_link", ...ref, villageId: t.villageId,
    summary: d.sent ? "Tautan atur sandi terkirim lewat email" : "Email gagal terkirim; tautan manual ditampilkan sekali kepada admin",
    metadata: { phase: "result", sent: d.sent, failureReason: d.reason ?? null, manualLinkShown: Boolean(d.manualLink) },
  });
  return ok({
    sent: d.sent,
    emailMasked: maskEmail(t.email),
    expiresAt: d.expiresAt.toISOString(),
    // Hanya bila email gagal; JANGAN disimpan/log. Muncul sekali di respons ini.
    ...(d.manualLink ? { manualLink: d.manualLink } : {}),
    ...(!d.sent ? { failureReason: d.reason ?? "failed" } : {}),
  });
}

async function staffDeactivate(ctx: ActionCtx, t: Staff, force: boolean): Promise<ActionResult> {
  if (!t.isActive) return fail(409, "Akun sudah nonaktif.");
  if (t.role === "admin") {
    const others = await ctx.db.user.count({ where: { villageId: t.villageId, role: "admin", isActive: true, id: { not: t.id } } });
    if (others === 0 && !force) {
      return fail(409, "Ini satu-satunya admin aktif di desa tersebut. Menonaktifkannya membuat desa tak punya pengelola. Ulangi dengan konfirmasi eksplisit bila memang perlu.", "LAST_ADMIN");
    }
  }
  // Jejak KETAT sebelum efek: bila gagal tertulis, akun tidak dinonaktifkan.
  await ctx.auditStrict({
    action: "account.deactivate", ...auditRef("staff", t.id), villageId: t.villageId,
    summary: `Menonaktifkan akun ${maskEmail(t.email)} (${t.role})`,
    metadata: { reason: ctx.reason, accountType: "staff", role: t.role, force },
  });
  const now = new Date();
  const revoked = await ctx.db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: t.id }, data: { isActive: false } });
    await tx.deviceToken.updateMany({ where: { accountType: "staff", accountId: t.id, disabledAt: null }, data: { disabledAt: now } });
    return revokeStaffSessions(tx, t.id, now);
  });
  return ok({ isActive: false, mobileSessionsRevoked: revoked });
}

async function staffActivate(ctx: ActionCtx, t: Staff): Promise<ActionResult> {
  if (t.isActive) return fail(409, "Akun sudah aktif.");
  await ctx.db.user.update({ where: { id: t.id }, data: { isActive: true } });
  await ctx.audit({
    action: "account.activate", ...auditRef("staff", t.id), villageId: t.villageId,
    summary: `Mengaktifkan kembali akun ${maskEmail(t.email)}`,
    metadata: { reason: ctx.reason, accountType: "staff", role: t.role },
  });
  return ok({ isActive: true });
}

async function staffForceLogout(ctx: ActionCtx, t: Staff): Promise<ActionResult> {
  const revoked = await ctx.db.$transaction((tx) => revokeStaffSessions(tx, t.id));
  await ctx.audit({
    action: "account.force_logout", ...auditRef("staff", t.id), villageId: t.villageId,
    summary: `Memaksa keluar semua sesi akun ${maskEmail(t.email)}`,
    metadata: { reason: ctx.reason, accountType: "staff", mobileSessionsRevoked: revoked },
  });
  return ok({ mobileSessionsRevoked: revoked });
}

async function staffChangeEmail(ctx: ActionCtx, t: Staff, raw: unknown): Promise<ActionResult> {
  const next = normalizeAccountEmail(raw);
  if (!next) return fail(400, "Format email baru tidak valid.");
  if (next === t.email.toLowerCase()) return fail(400, "Email baru sama dengan email saat ini.");
  if (await isEmailTakenAnywhere(ctx.db, next)) return fail(409, "Email sudah dipakai akun lain.", "EMAIL_TAKEN");
  // Jejak KETAT sebelum efek (kedua sisi email tersamar): perubahan email adalah jalur pengambilalihan akun.
  await ctx.auditStrict({
    action: "account.change_email", ...auditRef("staff", t.id), villageId: t.villageId,
    summary: `Mengganti email akun: ${maskedEmailChange(t.email, next)}`,
    metadata: { reason: ctx.reason, accountType: "staff", change: maskedEmailChange(t.email, next) },
  });
  const now = new Date();
  let revoked = 0;
  try {
    revoked = await ctx.db.$transaction(async (tx) => {
      await tx.user.update({ where: { id: t.id }, data: { email: next } });
      // Tautan atur sandi yang terlanjur dikirim ke alamat lama tidak boleh dipakai lagi.
      await tx.authToken.updateMany({ where: { userId: t.id, usedAt: null }, data: { usedAt: now } });
      return revokeStaffSessions(tx, t.id, now);
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return fail(409, "Email sudah dipakai akun lain.", "EMAIL_TAKEN");
    throw e;
  }
  return ok({ emailMasked: maskEmail(next), mobileSessionsRevoked: revoked });
}

async function staffAiCredits(ctx: ActionCtx, t: Staff, body: Record<string, unknown>): Promise<ActionResult> {
  const input = parseAiCreditsInput(body);
  if (!input.ok) return fail(400, input.error);
  // Kredit AI bernilai uang: jejak KETAT (maksud perubahan) ditulis sebelum saldo diubah.
  await ctx.auditStrict({
    action: "account.ai_credits", ...auditRef("staff", t.id), villageId: t.villageId,
    summary: `Kredit AI ${maskEmail(t.email)}: ${input.value.kind === "set" ? "atur ke" : "ubah sebesar"} ${input.value.value}`,
    metadata: { reason: ctx.reason, mode: input.value.kind, value: input.value.value },
  });
  const r = await applyAiCredits(ctx.db, t.id, input.value);
  if (!r) return NOT_FOUND;
  return ok({ aiCredits: r.after, before: r.before });
}

/**
 * Yang realistis dibuka untuk akun staf: pembatas login web per-email (`web-login-email`, 60 percobaan/30 menit lintas IP).
 * Pembatas per-IP dan per-IP+email tidak bisa dihitung ulang dari akun (kunci memuat IP) dan hangus sendiri dalam 10-15 menit.
 */
async function staffUnlock(ctx: ActionCtx, t: Staff): Promise<ActionResult> {
  const key = limiterKey("web-login-email", t.email.toLowerCase());
  const r = await ctx.db.mobileRateLimit.deleteMany({ where: { key } });
  await ctx.audit({
    action: "account.unlock", ...auditRef("staff", t.id), villageId: t.villageId,
    summary: `Membuka pembatas login akun ${maskEmail(t.email)}`,
    metadata: { reason: ctx.reason, accountType: "staff", cleared: r.count },
  });
  return ok({ cleared: r.count });
}

// ───────────────────────────── Warga mobile ─────────────────────────────

async function citizenDeactivate(ctx: ActionCtx, t: Citizen): Promise<ActionResult> {
  if (t.status !== "ACTIVE") {
    return fail(409, t.status === "PENDING_VERIFY" ? "Pendaftaran masih menunggu persetujuan desa; tidak bisa dibekukan dari sini." : "Akun sudah dibekukan.");
  }
  await ctx.auditStrict({
    action: "account.deactivate", ...auditRef("citizen", t.id), villageId: t.villageId,
    summary: `Membekukan akun warga @${t.username}`,
    metadata: { reason: ctx.reason, accountType: "citizen" },
  });
  const now = new Date();
  const revoked = await ctx.db.$transaction(async (tx) => {
    await tx.citizenAccount.update({ where: { id: t.id }, data: { status: "SUSPENDED" } });
    await tx.deviceToken.updateMany({ where: { accountType: "citizen", accountId: t.id, disabledAt: null }, data: { disabledAt: now } });
    return revokeCitizenSessions(tx, t.id, now);
  });
  return ok({ status: "SUSPENDED", mobileSessionsRevoked: revoked });
}

async function citizenActivate(ctx: ActionCtx, t: Citizen): Promise<ActionResult> {
  // PENDING_VERIFY sengaja tidak bisa diaktifkan dari sini: persetujuan pendaftaran adalah wewenang desa.
  if (t.status !== "SUSPENDED") return fail(409, "Hanya akun yang dibekukan yang bisa diaktifkan kembali.");
  await ctx.db.citizenAccount.update({ where: { id: t.id }, data: { status: "ACTIVE" } });
  await ctx.audit({
    action: "account.activate", ...auditRef("citizen", t.id), villageId: t.villageId,
    summary: `Mengaktifkan kembali akun warga @${t.username}`,
    metadata: { reason: ctx.reason, accountType: "citizen" },
  });
  return ok({ status: "ACTIVE" });
}

async function citizenForceLogout(ctx: ActionCtx, t: Citizen): Promise<ActionResult> {
  const revoked = await ctx.db.$transaction((tx) => revokeCitizenSessions(tx, t.id));
  await ctx.audit({
    action: "account.force_logout", ...auditRef("citizen", t.id), villageId: t.villageId,
    summary: `Memaksa keluar semua sesi akun warga @${t.username}`,
    metadata: { reason: ctx.reason, accountType: "citizen", mobileSessionsRevoked: revoked },
  });
  return ok({ mobileSessionsRevoked: revoked });
}

async function citizenUnlock(ctx: ActionCtx, t: Citizen): Promise<ActionResult> {
  await ctx.db.citizenAccount.update({ where: { id: t.id }, data: { failedAttempts: 0, lockedUntil: null } });
  // Pembatas "lupa password" per NIK (lihat auth/password/reset) ikut dibuka; NIK tidak pernah keluar dari server.
  const rl = await ctx.db.mobileRateLimit.deleteMany({ where: { key: limiterKey("pw-nik", t.resident.nik) } });
  await ctx.audit({
    action: "citizen.unlock", ...auditRef("citizen", t.id), villageId: t.villageId,
    summary: `Membuka kunci login akun warga @${t.username}`,
    metadata: { reason: ctx.reason, accountType: "citizen", resetLimiterCleared: rl.count },
  });
  return ok({ unlocked: true });
}

const RESET_CODE_TTL_MS = 24 * 3600 * 1000;

/**
 * Kode reset sandi warga (pola sama dengan perangkat desa: `ActivationCode` RESET, 24 jam, sekali pakai, warga tetap harus
 * memasukkan NIK-nya sendiri). Kode hanya ada di respons ini; DB hanya menyimpan hash; jejak tidak memuat kode.
 */
async function citizenResetCode(ctx: ActionCtx, t: Citizen): Promise<ActionResult> {
  if (t.status === "SUSPENDED") return fail(409, "Akun dibekukan. Aktifkan dulu sebelum menerbitkan kode reset.");
  const rl = await checkRateLimitDb(limiterKey("admin-citizen-reset-code", t.villageId), { max: 30, windowMs: 60 * 60_000 });
  if (!rl.ok) return fail(429, "Terlalu banyak kode reset diterbitkan untuk desa ini. Coba lagi nanti.", "RATE_LIMITED");
  const ref = auditRef("citizen", t.id);
  await ctx.auditStrict({
    action: "citizen.reset_code", ...ref, villageId: t.villageId,
    summary: `Menerbitkan kode reset sandi untuk akun warga @${t.username}`,
    metadata: { reason: ctx.reason, accountType: "citizen", ttlHours: 24 },
  });
  const now = new Date();
  for (let i = 0; i < 5; i += 1) {
    const code = generateActivationCode();
    try {
      const row = await ctx.db.$transaction(async (tx) => {
        // Kode reset lama yang belum dipakai dihanguskan: hanya satu yang berlaku.
        await tx.activationCode.updateMany({
          where: { purpose: "RESET", residentId: t.residentId, villageId: t.villageId, expiresAt: { gt: now } },
          data: { expiresAt: now },
        });
        return tx.activationCode.create({
          data: {
            villageId: t.villageId, purpose: "RESET", residentId: t.residentId, maxUses: 1, createdById: null,
            codeHash: hashActivationCode(normalizeActivationCode(code)),
            expiresAt: new Date(now.getTime() + RESET_CODE_TTL_MS),
          },
        });
      });
      // Kode muncul sekali di respons ini; JANGAN simpan/log.
      return ok({ code, expiresAt: row.expiresAt.toISOString(), note: "Warga harus memasukkan kode ini bersama NIK-nya di menu Lupa sandi." });
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
    }
  }
  return fail(500, "Gagal membuat kode. Coba lagi.");
}
