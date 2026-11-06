/** Statistik penggunaan (server): pengguna staf, akun warga mobile, desa tanpa login, add-on modul, kredit AI. */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BILLING_CATALOG } from "@/lib/billing/catalog";
import { ATTENDANCE_CAPACITY_MODULE_CODE } from "@/lib/attendance/addons";
import { ARSIP_ADDON_MODULE_CODE } from "@/lib/digitalArchive/storage-limit";
import { WEBSITE_CUSTOM_MODULE_CODE } from "@/lib/website-service/subscription";
import { toNum } from "./aggregate";
import { DAY_MS } from "./period";

export type InactiveVillage = { id: number; name: string; regency: string; status: string; lastLogin: string | null };
export type UsageStats = {
  staff: { total: number; active7d: number; active30d: number; villagesActive30d: number };
  citizens: { total: number; active30d: number };
  /** Desa berlangganan aktif/trial berjalan, berumur > 7 hari, tanpa login staf 30 hari. */
  inactiveVillages: { total: number; sample: InactiveVillage[] };
  /** Add-on modul yang sedang berlaku (BUKAN telemetri pemakaian fitur). */
  topModules: Array<{ moduleCode: string; label: string; count: number }>;
  aiCredits: { totalRemaining: number; usersLow: number; lowThreshold: number };
};

export const AI_CREDITS_LOW_THRESHOLD = 100;
export const INACTIVE_VILLAGE_SAMPLE = 10;

const MODULE_LABEL: Record<string, string> = {
  [ATTENDANCE_CAPACITY_MODULE_CODE]: "Kapasitas Absensi",
  [ARSIP_ADDON_MODULE_CODE]: "Arsip Digital",
  [WEBSITE_CUSTOM_MODULE_CODE]: "Website Desa Kustom",
};
export function moduleLabel(code: string): string {
  if (MODULE_LABEL[code]) return MODULE_LABEL[code];
  if (Object.hasOwn(BILLING_CATALOG.module_addon, code)) return BILLING_CATALOG.module_addon[code as keyof typeof BILLING_CATALOG.module_addon].name;
  return code;
}

export async function inactiveVillages(now: Date, limit = INACTIVE_VILLAGE_SAMPLE) {
  const cut30 = new Date(now.getTime() - 30 * DAY_MS);
  const newCut = new Date(now.getTime() - 7 * DAY_MS);
  const base = Prisma.sql`
    FROM villages v LEFT JOIN users u ON u.villageId = v.id AND u.isActive = 1
    WHERE v.isActive = 1 AND LOWER(v.subscriptionStatus) IN ('active', 'trial')
      AND (v.subscriptionExpiry IS NULL OR v.subscriptionExpiry > ${now}) AND v.createdAt < ${newCut}
    GROUP BY v.id, v.name, v.regency, v.subscriptionStatus
    HAVING MAX(u.lastLogin) IS NULL OR MAX(u.lastLogin) < ${cut30}`;
  const [rows, totalRows] = await Promise.all([
    prisma.$queryRaw<Array<{ id: number; name: string; regency: string; st: string; last: Date | null }>>(Prisma.sql`
      SELECT v.id AS id, v.name AS name, v.regency AS regency, LOWER(v.subscriptionStatus) AS st, MAX(u.lastLogin) AS \`last\` ${base}
      ORDER BY (LOWER(v.subscriptionStatus) = 'active') DESC, \`last\` ASC, v.id ASC LIMIT ${Math.min(Math.max(limit, 1), 50)}`),
    prisma.$queryRaw<Array<{ n: bigint }>>(Prisma.sql`SELECT COUNT(*) AS n FROM (SELECT v.id ${base}) t`),
  ]);
  return {
    total: toNum(totalRows[0]?.n),
    sample: rows.map((r) => ({ id: Number(r.id), name: r.name, regency: r.regency, status: r.st, lastLogin: r.last ? new Date(r.last).toISOString() : null })),
  };
}

export async function computeUsageStats(now: Date): Promise<UsageStats> {
  const d7 = new Date(now.getTime() - 7 * DAY_MS);
  const d30 = new Date(now.getTime() - 30 * DAY_MS);
  const [staffTotal, a7, a30, villages30, citTotal, citActive, inactive, modules, ai] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isActive: true, lastLogin: { gte: d7 } } }),
    prisma.user.count({ where: { isActive: true, lastLogin: { gte: d30 } } }),
    prisma.$queryRaw<Array<{ n: bigint }>>(Prisma.sql`SELECT COUNT(DISTINCT villageId) AS n FROM users WHERE isActive = 1 AND lastLogin >= ${d30}`),
    prisma.citizenAccount.count({ where: { status: "ACTIVE", deletedAt: null } }),
    prisma.citizenAccount.count({ where: { status: "ACTIVE", deletedAt: null, lastLoginAt: { gte: d30 } } }),
    inactiveVillages(now),
    prisma.villageModuleSubscription.groupBy({
      by: ["moduleCode"], where: { status: "active", expiryDate: { gt: now } },
      _count: { _all: true }, orderBy: { _count: { moduleCode: "desc" } }, take: 10,
    }),
    Promise.all([
      prisma.user.aggregate({ where: { isActive: true }, _sum: { aiCredits: true } }),
      prisma.user.count({ where: { isActive: true, aiCredits: { lt: AI_CREDITS_LOW_THRESHOLD } } }),
    ]),
  ]);
  return {
    staff: { total: staffTotal, active7d: a7, active30d: a30, villagesActive30d: toNum(villages30[0]?.n) },
    citizens: { total: citTotal, active30d: citActive },
    inactiveVillages: inactive,
    topModules: modules.map((m) => ({ moduleCode: m.moduleCode, label: moduleLabel(m.moduleCode), count: m._count._all })),
    aiCredits: { totalRemaining: toNum(ai[0]._sum.aiCredits), usersLow: ai[1], lowThreshold: AI_CREDITS_LOW_THRESHOLD },
  };
}
