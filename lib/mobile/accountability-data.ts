import { prisma } from "@/lib/prisma";
import {
  computeAccountability, splitWindows, type Accountability, type MailRow, type ReportRow,
} from "./accountability-logic";

const DAY = 24 * 3600 * 1000;
const ROW_CAP = 30000;

export type VillageAccountability = { villageId: number; current: Accountability; previous: Accountability | null };

/**
 * Muat metrik rapor layanan untuk daftar desa. `withPrevious` mengambil dua jendela berurutan (untuk tren).
 * Hanya agregat: tidak ada nama/NIK warga yang keluar dari fungsi ini. Baris dibatasi ROW_CAP per tabel;
 * untuk wilayah sangat besar angkanya bisa terpotong (lihat `truncated`).
 */
export async function loadAccountability(
  villageIds: number[],
  opts: { windowDays?: number; withPrevious?: boolean; now?: Date } = {},
): Promise<{ items: VillageAccountability[]; truncated: boolean }> {
  const now = opts.now ?? new Date();
  const windowDays = opts.windowDays ?? 90;
  if (villageIds.length === 0) return { items: [], truncated: false };
  const since = new Date(now.getTime() - (opts.withPrevious ? 2 : 1) * windowDays * DAY);

  const [mailRows, reportRows, residents, accounts] = await Promise.all([
    prisma.mailRequest.findMany({
      where: { villageId: { in: villageIds }, requestDate: { gte: since } },
      select: { villageId: true, status: true, channel: true, requestDate: true, processedDate: true },
      take: ROW_CAP,
    }),
    prisma.citizenReport.findMany({
      where: { villageId: { in: villageIds }, createdAt: { gte: since }, status: { not: "DRAFT" } },
      select: { id: true, villageId: true, status: true, createdAt: true, resolvedFeedback: true },
      take: ROW_CAP,
    }),
    prisma.resident.groupBy({ by: ["villageId"], where: { villageId: { in: villageIds }, isAlive: true }, _count: { _all: true } }),
    prisma.citizenAccount.groupBy({ by: ["villageId"], where: { villageId: { in: villageIds }, status: "ACTIVE", deletedAt: null }, _count: { _all: true } }),
  ]);

  const firstResponse = new Map<string, Date>();
  const ids = reportRows.map((r) => r.id);
  for (let i = 0; i < ids.length; i += 5000) {
    const chunk = await prisma.citizenReportResponse.groupBy({ by: ["citizenReportId"], where: { citizenReportId: { in: ids.slice(i, i + 5000) } }, _min: { createdAt: true } });
    for (const c of chunk) if (c._min.createdAt) firstResponse.set(c.citizenReportId.toString(), c._min.createdAt);
  }

  const mailBy = new Map<number, MailRow[]>();
  for (const m of mailRows) (mailBy.get(m.villageId) ?? mailBy.set(m.villageId, []).get(m.villageId)!).push(m);
  const reportBy = new Map<number, ReportRow[]>();
  for (const r of reportRows) {
    const row: ReportRow = { status: r.status, createdAt: r.createdAt, firstResponseAt: firstResponse.get(r.id.toString()) ?? null, resolvedFeedback: r.resolvedFeedback };
    (reportBy.get(r.villageId) ?? reportBy.set(r.villageId, []).get(r.villageId)!).push(row);
  }
  const residentBy = new Map(residents.map((r) => [r.villageId, r._count._all]));
  const accountBy = new Map(accounts.map((a) => [a.villageId, a._count._all]));

  const items = villageIds.map((villageId) => {
    const m = splitWindows(mailBy.get(villageId) ?? [], (x) => x.requestDate, now, windowDays);
    const r = splitWindows(reportBy.get(villageId) ?? [], (x) => x.createdAt, now, windowDays);
    const base = { aliveResidents: residentBy.get(villageId) ?? 0, activeAccounts: accountBy.get(villageId) ?? 0, now };
    return {
      villageId,
      current: computeAccountability({ ...base, mail: m.current, reports: r.current }),
      previous: opts.withPrevious ? computeAccountability({ ...base, mail: m.previous, reports: r.previous }) : null,
    };
  });
  return { items, truncated: mailRows.length >= ROW_CAP || reportRows.length >= ROW_CAP };
}
