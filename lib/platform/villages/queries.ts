import { prisma } from "@/lib/prisma";
import { createTtlCache } from "@/lib/cache/ttl-cache";
import { getSubscriptionPhaseInfo } from "@/lib/subscription";
import { isSensitiveKey } from "@/lib/audit/diff";
import { maskEmail, safeEntityId } from "@/lib/platform/villages/mask";
import { runHealthChecks, type HealthInput } from "@/lib/platform/villages/health";

/**
 * Pengambilan data Desa 360 (baca-saja). Semua hitungan memakai `count`/`groupBy`/`aggregate` pada kolom berindeks
 * (villageId, ...); daftar selalu berbatas. TIDAK ada NIK, telepon, atau email utuh yang keluar dari sini.
 */

const MS_DAY = 24 * 60 * 60 * 1000;
export const INVOICE_LIMIT = 20;
export const MODULE_LIMIT = 50;
export const USERS_MAX = 100;
export const ACTIVITY_MAX = 50;

export async function loadVillageDetail(id: number, now: Date = new Date()) {
  const village = await prisma.village.findUnique({
    where: { id },
    select: {
      id: true, code: true, name: true, district: true, regency: true, province: true,
      website: true, email: true, isActive: true, createdAt: true, onboardingCompletedAt: true,
      subscriptionPlan: true, subscriptionStatus: true, subscriptionDate: true, subscriptionExpiry: true,
      storageLimit: true, storageUsed: true,
      absensiGpsAddonActive: true, absensiGpsAddonExpiry: true,
      acquiredAt: true, acquisitionSource: true,
      acquiredByPartner: { select: { id: true, name: true } },
    },
  });
  if (!village) return null;

  const since30 = new Date(now.getTime() - 30 * MS_DAY);
  const [residents, households, officials, users, activeUsers, citizenAccounts, mail30, req30, trx30, lastLogin, modules, invoices] =
    await Promise.all([
      prisma.resident.count({ where: { villageId: id } }),
      prisma.household.count({ where: { villageId: id } }),
      prisma.official.count({ where: { villageId: id, status: "active" } }),
      prisma.user.count({ where: { villageId: id } }),
      prisma.user.count({ where: { villageId: id, isActive: true } }),
      prisma.citizenAccount.count({ where: { villageId: id, deletedAt: null } }),
      prisma.mailRequest.count({ where: { villageId: id, createdAt: { gte: since30 } } }),
      prisma.request.count({ where: { villageId: id, createdAt: { gte: since30 } } }),
      prisma.transaction.count({ where: { villageId: id, createdAt: { gte: since30 } } }),
      prisma.user.aggregate({ where: { villageId: id }, _max: { lastLogin: true } }),
      prisma.villageModuleSubscription.findMany({
        where: { villageId: id },
        orderBy: { expiryDate: "asc" },
        take: MODULE_LIMIT,
        select: { id: true, moduleCode: true, planCode: true, status: true, startDate: true, expiryDate: true },
      }),
      prisma.billingInvoice.findMany({
        where: { villageId: id },
        orderBy: { createdAt: "desc" },
        take: INVOICE_LIMIT,
        // Sengaja TANPA rawResponse/metadata/paymentUrl/qr/va: hanya kolom ringkas.
        select: { id: true, invoiceNumber: true, productType: true, planCode: true, amount: true, status: true, createdAt: true, paidAt: true, expiresAt: true },
      }),
    ]);

  const info = getSubscriptionPhaseInfo(
    { subscriptionStatus: village.subscriptionStatus, subscriptionExpiry: village.subscriptionExpiry },
    now.getTime(),
  );
  const storagePercent = village.storageLimit > 0 ? Math.round((village.storageUsed / village.storageLimit) * 1000) / 10 : 0;

  return {
    village: {
      id: village.id,
      code: village.code,
      name: village.name,
      district: village.district,
      regency: village.regency,
      province: village.province,
      website: village.website,
      emailMasked: village.email ? maskEmail(village.email) : null,
      isActive: village.isActive,
      createdAt: village.createdAt.toISOString(),
      onboardingCompletedAt: village.onboardingCompletedAt?.toISOString() ?? null,
    },
    subscription: {
      plan: village.subscriptionPlan,
      status: village.subscriptionStatus,
      phase: info.phase,
      readable: info.readable,
      writable: info.writable,
      daysRemaining: info.daysRemaining,
      startedAt: village.subscriptionDate?.toISOString() ?? null,
      expiry: village.subscriptionExpiry?.toISOString() ?? null,
      gpsAddon: {
        active: village.absensiGpsAddonActive,
        expiry: village.absensiGpsAddonExpiry?.toISOString() ?? null,
      },
    },
    storage: { limitGb: village.storageLimit, usedGb: Math.round(village.storageUsed * 100) / 100, percent: storagePercent },
    acquisition: {
      partnerId: village.acquiredByPartner?.id ?? null,
      partnerName: village.acquiredByPartner?.name ?? null,
      acquiredAt: village.acquiredAt?.toISOString() ?? null,
      source: village.acquisitionSource,
    },
    counts: {
      residents, households, officials, users, activeUsers, citizenAccounts,
      mailRequests30d: mail30, requests30d: req30, transactions30d: trx30,
    },
    lastLogin: lastLogin._max.lastLogin?.toISOString() ?? null,
    modules: modules.map((m) => ({
      id: m.id,
      moduleCode: m.moduleCode,
      planCode: m.planCode,
      status: m.status,
      startDate: m.startDate.toISOString(),
      expiryDate: m.expiryDate.toISOString(),
      expired: m.expiryDate.getTime() <= now.getTime(),
    })),
    invoices: invoices.map((v) => ({
      id: v.id.toString(),
      invoiceNumber: v.invoiceNumber,
      productType: v.productType,
      planCode: v.planCode,
      amount: Number(v.amount),
      status: v.status,
      createdAt: v.createdAt.toISOString(),
      paidAt: v.paidAt?.toISOString() ?? null,
      expiresAt: v.expiresAt?.toISOString() ?? null,
    })),
  };
}

// ---- Inspektur ----

export async function inspectUsers(villageId: number, limit: number) {
  const take = Math.max(1, Math.min(USERS_MAX, limit));
  const [total, rows] = await Promise.all([
    prisma.user.count({ where: { villageId } }),
    prisma.user.findMany({
      where: { villageId },
      orderBy: [{ isActive: "desc" }, { role: "asc" }, { id: "asc" }],
      take,
      select: { id: true, name: true, email: true, role: true, isActive: true, lastLogin: true, createdAt: true },
    }),
  ]);
  return {
    total,
    truncated: total > rows.length,
    users: rows.map((u) => ({
      id: u.id,
      name: u.name,
      emailMasked: maskEmail(u.email),
      role: u.role,
      isActive: u.isActive,
      lastLogin: u.lastLogin?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
    })),
  };
}

export async function inspectActivity(villageId: number, limit: number) {
  const take = Math.max(1, Math.min(ACTIVITY_MAX, limit));
  const rows = await prisma.auditLog.findMany({
    where: { villageId },
    orderBy: { createdAt: "desc" },
    take,
    // `changes`/`metadata`/ipAddress/userAgent sengaja TIDAK dipilih seluruhnya: hanya nama kolom yang berubah (disaring).
    select: { id: true, action: true, entity: true, entityId: true, userId: true, createdAt: true, changes: true },
  });
  const userIds = [...new Set(rows.map((r) => r.userId).filter((v): v is number => v != null))];
  const names = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds }, villageId }, select: { id: true, name: true } })
    : [];
  const nameOf = new Map(names.map((n) => [n.id, n.name]));
  return {
    activity: rows.map((r) => ({
      id: r.id.toString(),
      action: r.action,
      entity: r.entity,
      entityId: safeEntityId(r.entityId),
      actorName: r.userId != null ? (nameOf.get(r.userId) ?? null) : null,
      fields: changedFieldNames(r.changes),
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

/** Hanya NAMA kolom (bukan nilai) dan hanya yang tidak sensitif. */
export function changedFieldNames(changes: unknown, max = 8): string[] {
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) return [];
  return Object.keys(changes as Record<string, unknown>)
    .filter((k) => k.length <= 40 && /^[A-Za-z0-9_]+$/.test(k) && !isSensitiveKey(k))
    .slice(0, max);
}

export async function inspectModules(villageId: number, now: Date = new Date()) {
  const rows = await prisma.villageModuleSubscription.findMany({
    where: { villageId },
    orderBy: { expiryDate: "asc" },
    take: MODULE_LIMIT,
    select: { id: true, moduleCode: true, planCode: true, status: true, startDate: true, expiryDate: true },
  });
  return {
    modules: rows.map((m) => ({
      id: m.id,
      moduleCode: m.moduleCode,
      planCode: m.planCode,
      status: m.status,
      startDate: m.startDate.toISOString(),
      expiryDate: m.expiryDate.toISOString(),
      expired: m.expiryDate.getTime() <= now.getTime(),
    })),
  };
}

// ---- Kesehatan data ----

type HealthAggregates = Omit<HealthInput, "now" | "village">;
const healthCache = createTtlCache<number, HealthAggregates>({ ttlMs: 20_000, maxEntries: 200 });
/** Untuk tes & setelah mutasi: buang cache agregat. */
export function clearVillageHealthCache(villageId?: number) {
  if (villageId == null) healthCache.clear();
  else healthCache.invalidate(villageId);
}

async function loadHealthAggregates(villageId: number, now: Date): Promise<HealthAggregates> {
  const since30 = new Date(now.getTime() - 30 * MS_DAY);
  const since7 = new Date(now.getTime() - 7 * MS_DAY);
  const in7 = new Date(now.getTime() + 7 * MS_DAY);
  const [
    uTotal, uActive, uAdmins, uLogin30, audit7,
    rTotal, rNoKk, dupNik,
    hTotal, hNoHead,
    oActive, oNoAcc,
    invOverdue, modExpired, modSoon,
  ] = await Promise.all([
    prisma.user.count({ where: { villageId } }),
    prisma.user.count({ where: { villageId, isActive: true } }),
    prisma.user.count({ where: { villageId, isActive: true, role: "admin" } }),
    prisma.user.count({ where: { villageId, isActive: true, lastLogin: { gte: since30 } } }),
    prisma.auditLog.count({ where: { villageId, createdAt: { gte: since7 } } }),
    prisma.resident.count({ where: { villageId } }),
    prisma.resident.count({ where: { villageId, OR: [{ kk: null }, { kk: "" }] } }),
    // groupBy + having: hanya NIK yang berulang; tidak menarik semua baris. Batas 500 kelompok.
    prisma.resident.groupBy({ by: ["nik"], where: { villageId }, having: { nik: { _count: { gt: 1 } } }, orderBy: { nik: "asc" }, take: 500 }),
    prisma.household.count({ where: { villageId } }),
    prisma.household.count({ where: { villageId, status: "ACTIVE", headResidentId: null } }),
    prisma.official.count({ where: { villageId, status: "active" } }),
    prisma.official.count({ where: { villageId, status: "active", userId: null } }),
    prisma.billingInvoice.count({ where: { villageId, status: "pending", expiresAt: { lt: now } } }),
    prisma.villageModuleSubscription.count({ where: { villageId, status: "active", expiryDate: { lt: now } } }),
    prisma.villageModuleSubscription.count({ where: { villageId, status: "active", expiryDate: { gte: now, lte: in7 } } }),
  ]);
  return {
    users: { total: uTotal, active: uActive, activeAdmins: uAdmins, loggedIn30d: uLogin30 },
    auditEvents7d: audit7,
    residents: { total: rTotal, withoutKk: rNoKk, duplicateNikGroups: dupNik.length },
    households: { total: hTotal, activeWithoutHead: hNoHead },
    officials: { active: oActive, activeWithoutAccount: oNoAcc },
    invoices: { pendingOverdue: invOverdue },
    modules: { expiredStillActive: modExpired, expiringIn7d: modSoon },
  };
}

export async function inspectHealth(villageId: number, now: Date = new Date()) {
  const village = await prisma.village.findUnique({
    where: { id: villageId },
    select: { isActive: true, createdAt: true, subscriptionStatus: true, subscriptionExpiry: true, storageLimit: true, storageUsed: true },
  });
  if (!village) return null;
  const agg = await healthCache.getOrLoad(villageId, () => loadHealthAggregates(villageId, now));
  const report = runHealthChecks({
    now,
    village: {
      isActive: village.isActive,
      createdAt: village.createdAt,
      subscriptionStatus: village.subscriptionStatus,
      subscriptionExpiry: village.subscriptionExpiry,
      storageLimitGb: village.storageLimit,
      storageUsedGb: village.storageUsed,
    },
    ...agg,
  });
  return { ...report, generatedAt: now.toISOString() };
}
