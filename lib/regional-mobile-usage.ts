import { prisma } from "@/lib/prisma";

/**
 * Pemakaian aplikasi mobile per desa untuk dashboard kabupaten. Hanya agregat (jumlah akun), tanpa nama/NIK.
 * Aktif dihitung dari MobileSession.lastUsedAt (diperbarui tiap token disegarkan, jadi kira-kira "dipakai dalam N hari").
 */

export type UsageStatus = "belum" | "sepi" | "aktif";

export type UsageSession = { villageId: number; accountType: string; accountId: number; lastUsedAt: Date };
export type VillageUsage = {
  villageId: number;
  citizenAccounts: number;
  activeCitizens7d: number;
  activeCitizens30d: number;
  activeStaff30d: number;
  lastActiveAt: string | null;
  status: UsageStatus;
};

const DAY = 86_400_000;

export function buildMobileUsage(
  villageIds: number[],
  citizenAccountCounts: Map<number, number>,
  sessions: UsageSession[],
  now = new Date(),
): { villages: VillageUsage[]; totals: { belum: number; sepi: number; aktif: number; activeCitizens30d: number; citizenAccounts: number } } {
  const t7 = now.getTime() - 7 * DAY;
  const t30 = now.getTime() - 30 * DAY;
  type Acc = { c7: Set<number>; c30: Set<number>; s30: Set<number>; last: number };
  const by = new Map<number, Acc>();
  for (const id of villageIds) by.set(id, { c7: new Set(), c30: new Set(), s30: new Set(), last: 0 });
  for (const s of sessions) {
    const a = by.get(s.villageId);
    if (!a) continue;
    const ts = s.lastUsedAt.getTime();
    if (ts > a.last) a.last = ts;
    if (ts < t30) continue;
    if (s.accountType === "citizen") {
      a.c30.add(s.accountId);
      if (ts >= t7) a.c7.add(s.accountId);
    } else a.s30.add(s.accountId);
  }
  const villages: VillageUsage[] = villageIds.map((id) => {
    const a = by.get(id)!;
    const accounts = citizenAccountCounts.get(id) ?? 0;
    const status: UsageStatus = a.c30.size > 0 ? "aktif" : accounts > 0 || a.last > 0 ? "sepi" : "belum";
    return {
      villageId: id, citizenAccounts: accounts, activeCitizens7d: a.c7.size, activeCitizens30d: a.c30.size, activeStaff30d: a.s30.size,
      lastActiveAt: a.last ? new Date(a.last).toISOString() : null, status,
    };
  });
  const totals = { belum: 0, sepi: 0, aktif: 0, activeCitizens30d: 0, citizenAccounts: 0 };
  for (const v of villages) {
    totals[v.status] += 1;
    totals.activeCitizens30d += v.activeCitizens30d;
    totals.citizenAccounts += v.citizenAccounts;
  }
  return { villages, totals };
}

export async function loadMobileUsage(villageIds: number[], now = new Date()) {
  if (villageIds.length === 0) return buildMobileUsage([], new Map(), [], now);
  const since = new Date(now.getTime() - 400 * DAY);
  const [accounts, sessions] = await Promise.all([
    prisma.citizenAccount.groupBy({ by: ["villageId"], where: { villageId: { in: villageIds }, status: "ACTIVE" }, _count: { _all: true } }),
    prisma.mobileSession.findMany({
      where: { villageId: { in: villageIds }, lastUsedAt: { gte: since } },
      select: { villageId: true, accountType: true, accountId: true, lastUsedAt: true },
      take: 200000,
    }),
  ]);
  return buildMobileUsage(villageIds, new Map(accounts.map((a) => [a.villageId, a._count._all])), sessions, now);
}
