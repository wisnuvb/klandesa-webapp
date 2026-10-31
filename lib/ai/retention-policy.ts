const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Batas simpan riwayat chat Laras. Percakapan bisa memuat data warga yang ditulis pengguna, jadi tidak disimpan tanpa batas:
 * thread yang tidak berubah lebih dari `THREAD_PURGE_DAYS` dihapus permanen oleh job harian `cron/ai-retention`
 * (pesan ikut terhapus lewat cascade). Tabel audit (`audit_logs`) tidak memuat isi pesan, jadi tidak ikut dihapus.
 */
export const AI_RETENTION = {
  THREAD_PURGE_DAYS: 90,
  PURGE_BATCH_SIZE: 500,
  PURGE_MAX_BATCHES: 20,
} as const;

export function aiThreadPurgeBefore(now: Date = new Date()): Date {
  return new Date(now.getTime() - AI_RETENTION.THREAD_PURGE_DAYS * DAY_MS);
}
