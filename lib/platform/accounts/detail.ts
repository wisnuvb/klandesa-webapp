import type { PrismaClient } from "@prisma/client";
import { maskEmail, maskPhone } from "./mask";
import { auditRef, type AccountKind } from "./validate";

/** Detail satu akun untuk panel Pusat Akun. TIDAK memuat token, hash, atau data pribadi utuh. */

export type AuditEntryView = {
  id: string;
  action: string;
  summary: string;
  actorEmail: string;
  createdAt: string;
  reason: string | null;
};

export async function recentAuditFor(db: PrismaClient, kind: AccountKind, id: number, take = 20): Promise<AuditEntryView[]> {
  const ref = auditRef(kind, id);
  const rows = await db.platformAuditLog.findMany({
    where: { targetType: ref.targetType, targetId: ref.targetId },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, action: true, summary: true, actorEmail: true, createdAt: true, metadata: true },
  });
  return rows.map((r) => {
    const m = r.metadata && typeof r.metadata === "object" && !Array.isArray(r.metadata) ? (r.metadata as Record<string, unknown>) : {};
    return {
      id: r.id.toString(), action: r.action, summary: r.summary, actorEmail: r.actorEmail,
      createdAt: r.createdAt.toISOString(), reason: typeof m.reason === "string" ? m.reason : null,
    };
  });
}

export type StaffDetail = {
  kind: "staff";
  id: number;
  name: string;
  emailMasked: string;
  phoneMasked: string;
  role: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  aiCredits: number;
  village: { id: number; code: string; name: string; isActive: boolean };
  activeMobileSessions: number;
  /** Status tautan atur sandi yang masih berlaku (TANPA tokennya). */
  pendingTokens: { invite: { expiresAt: string } | null; reset: { expiresAt: string } | null };
  isLastActiveAdmin: boolean;
  audit: AuditEntryView[];
};

export type CitizenDetail = {
  kind: "citizen";
  id: number;
  name: string;
  username: string;
  status: string;
  signupMethod: string;
  failedAttempts: number;
  lockedUntil: string | null;
  lastLogin: string | null;
  createdAt: string;
  deleted: boolean;
  residentId: number;
  village: { id: number; code: string; name: string; isActive: boolean };
  activeMobileSessions: number;
  pendingResetCode: { expiresAt: string } | null;
  audit: AuditEntryView[];
};

export async function loadAccountDetail(db: PrismaClient, kind: AccountKind, id: number, now = new Date()): Promise<StaffDetail | CitizenDetail | null> {
  if (kind === "staff") {
    const u = await db.user.findUnique({
      where: { id },
      select: {
        id: true, villageId: true, name: true, email: true, phone: true, role: true, isActive: true, lastLogin: true,
        createdAt: true, aiCredits: true, village: { select: { id: true, code: true, name: true, isActive: true } },
      },
    });
    if (!u) return null;
    const [sessions, tokens, otherAdmins, audit] = await Promise.all([
      db.mobileSession.count({ where: { accountType: "staff", accountId: id, revokedAt: null, expiresAt: { gt: now } } }),
      db.authToken.findMany({
        where: { userId: id, usedAt: null, expiresAt: { gt: now } },
        orderBy: { expiresAt: "desc" }, take: 10, select: { purpose: true, expiresAt: true },
      }),
      u.role === "admin" && u.isActive
        ? db.user.count({ where: { villageId: u.villageId, role: "admin", isActive: true, id: { not: id } } })
        : Promise.resolve(1),
      recentAuditFor(db, "staff", id),
    ]);
    const pick = (p: string) => {
      const t = tokens.find((x) => x.purpose === p);
      return t ? { expiresAt: t.expiresAt.toISOString() } : null;
    };
    return {
      kind: "staff", id: u.id, name: u.name, emailMasked: maskEmail(u.email), phoneMasked: maskPhone(u.phone), role: u.role,
      isActive: u.isActive, lastLogin: u.lastLogin?.toISOString() ?? null, createdAt: u.createdAt.toISOString(),
      aiCredits: u.aiCredits, village: u.village, activeMobileSessions: sessions,
      pendingTokens: { invite: pick("INVITE"), reset: pick("RESET") },
      isLastActiveAdmin: u.role === "admin" && u.isActive && otherAdmins === 0,
      audit,
    };
  }
  const c = await db.citizenAccount.findUnique({
    where: { id },
    select: {
      id: true, username: true, status: true, signupMethod: true, failedAttempts: true, lockedUntil: true, lastLoginAt: true,
      createdAt: true, deletedAt: true, residentId: true, resident: { select: { name: true } },
      village: { select: { id: true, code: true, name: true, isActive: true } },
    },
  });
  if (!c) return null;
  const [sessions, code, audit] = await Promise.all([
    db.mobileSession.count({ where: { accountType: "citizen", accountId: id, revokedAt: null, expiresAt: { gt: now } } }),
    db.activationCode.findFirst({
      where: { purpose: "RESET", residentId: c.residentId, expiresAt: { gt: now }, usedCount: { equals: 0 } },
      orderBy: { expiresAt: "desc" }, select: { expiresAt: true },
    }),
    recentAuditFor(db, "citizen", id),
  ]);
  return {
    kind: "citizen", id: c.id, name: c.resident.name, username: c.username, status: c.status, signupMethod: c.signupMethod,
    failedAttempts: c.failedAttempts, lockedUntil: c.lockedUntil && c.lockedUntil > now ? c.lockedUntil.toISOString() : null,
    lastLogin: c.lastLoginAt?.toISOString() ?? null, createdAt: c.createdAt.toISOString(), deleted: Boolean(c.deletedAt),
    residentId: c.residentId, village: c.village, activeMobileSessions: sessions,
    pendingResetCode: code ? { expiresAt: code.expiresAt.toISOString() } : null, audit,
  };
}
