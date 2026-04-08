import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type QuotaMeta = {
  usedBytes: number;
  limitBytes: number;
  incomingBytes: number;
};

export async function getArchiveUsedBytes(
  villageId: number,
  tx?: Prisma.TransactionClient,
): Promise<number> {
  const db = tx ?? prisma;
  const agg = await db.digitalArchive.aggregate({
    where: { villageId },
    _sum: { fileSize: true },
  });
  return Number(agg._sum.fileSize || 0);
}

export function getVillageStorageLimitBytes(storageLimitGb: number): number {
  return Math.max(0, storageLimitGb) * 1024 * 1024 * 1024;
}

/** true jika used + incoming melebihi limit. */
export function isStorageExceeded(
  usedBytes: number,
  incomingBytes: number,
  storageLimitGb: number,
): boolean {
  const limitBytes = getVillageStorageLimitBytes(storageLimitGb);
  return usedBytes + incomingBytes > limitBytes;
}

export async function assertStorageForUpload(
  villageId: number,
  storageLimitGb: number,
  incomingBytes: number,
  tx?: Prisma.TransactionClient,
): Promise<{ ok: true } | { ok: false; meta: QuotaMeta }> {
  if (!Number.isFinite(incomingBytes) || incomingBytes <= 0) {
    return {
      ok: false,
      meta: {
        usedBytes: await getArchiveUsedBytes(villageId, tx),
        limitBytes: getVillageStorageLimitBytes(storageLimitGb),
        incomingBytes,
      },
    };
  }
  const usedBytes = await getArchiveUsedBytes(villageId, tx);
  const limitBytes = getVillageStorageLimitBytes(storageLimitGb);
  if (usedBytes + incomingBytes > limitBytes) {
    return { ok: false, meta: { usedBytes, limitBytes, incomingBytes } };
  }
  return { ok: true };
}
