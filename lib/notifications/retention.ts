import { prisma } from "@/lib/prisma";
import { NOTIFICATION_RETENTION, notificationCutoffs } from "./retention-policy";

const { PURGE_BATCH_SIZE, PURGE_MAX_BATCHES } = NOTIFICATION_RETENTION;

/** Hapus per batch agar tidak mengunci tabel besar; berhenti bila batch tidak penuh atau batas batch tercapai. */
async function purgeInBatches<Id>(
  findIds: () => Promise<Id[]>,
  deleteIds: (ids: Id[]) => Promise<number>,
): Promise<number> {
  let total = 0;
  for (let i = 0; i < PURGE_MAX_BATCHES; i++) {
    const ids = await findIds();
    if (ids.length === 0) break;
    total += await deleteIds(ids);
    if (ids.length < PURGE_BATCH_SIZE) break;
  }
  return total;
}

export type PurgeResult = { adminDeleted: number; mobileDeleted: number };

/**
 * Hapus permanen notifikasi kedaluwarsa (web: `admin_notifications`, status bacanya ikut terhapus lewat cascade;
 * mobile: `user_notifications`). Aman dijalankan berulang.
 */
export async function purgeExpiredNotifications(now: Date = new Date()): Promise<PurgeResult> {
  const { purgeBefore, mobileReadPurgeBefore } = notificationCutoffs(now);

  const adminDeleted = await purgeInBatches(
    async () =>
      (
        await prisma.adminNotification.findMany({
          where: { createdAt: { lt: purgeBefore } },
          select: { id: true },
          take: PURGE_BATCH_SIZE,
        })
      ).map((r) => r.id),
    async (ids) => (await prisma.adminNotification.deleteMany({ where: { id: { in: ids } } })).count,
  );

  const mobileWhere = {
    OR: [{ createdAt: { lt: purgeBefore } }, { readAt: { not: null }, createdAt: { lt: mobileReadPurgeBefore } }],
  };
  const mobileDeleted = await purgeInBatches(
    async () =>
      (await prisma.userNotification.findMany({ where: mobileWhere, select: { id: true }, take: PURGE_BATCH_SIZE })).map(
        (r) => r.id,
      ),
    async (ids) => (await prisma.userNotification.deleteMany({ where: { id: { in: ids } } })).count,
  );

  return { adminDeleted, mobileDeleted };
}
