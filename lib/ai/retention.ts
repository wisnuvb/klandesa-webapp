import { prisma } from "@/lib/prisma";
import { AI_RETENTION, aiThreadPurgeBefore } from "./retention-policy";

export type AiPurgeResult = { threadsDeleted: number };

/**
 * Hapus permanen thread Laras yang tidak berubah melewati batas simpan (pesan ikut terhapus lewat cascade).
 * Per batch agar tidak mengunci tabel besar; aman dijalankan berulang.
 */
export async function purgeExpiredAiThreads(now: Date = new Date()): Promise<AiPurgeResult> {
  const before = aiThreadPurgeBefore(now);
  let threadsDeleted = 0;
  for (let i = 0; i < AI_RETENTION.PURGE_MAX_BATCHES; i++) {
    const rows = await prisma.aiAssistantThread.findMany({
      where: { updatedAt: { lt: before } },
      select: { id: true },
      take: AI_RETENTION.PURGE_BATCH_SIZE,
    });
    if (rows.length === 0) break;
    const res = await prisma.aiAssistantThread.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } });
    threadsDeleted += res.count;
    if (rows.length < AI_RETENTION.PURGE_BATCH_SIZE) break;
  }
  return { threadsDeleted };
}
