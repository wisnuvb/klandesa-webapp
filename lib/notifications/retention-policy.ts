const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Batas notifikasi dua tahap supaya tabel tidak tumbuh tanpa batas (biaya DB/server):
 * 1. Tampil: hanya notifikasi dalam `VISIBLE_DAYS` terakhir yang dimuat/dibuat (maks `LIST_LIMIT` baris di lonceng).
 * 2. Hapus permanen: yang lebih tua dari `PURGE_DAYS` dihapus job harian `cron/notification-retention`.
 *    Notifikasi mobile yang sudah dibaca dihapus lebih awal (`MOBILE_READ_PURGE_DAYS`) karena sudah tidak dibutuhkan.
 */
export const NOTIFICATION_RETENTION = {
  VISIBLE_DAYS: 30,
  PURGE_DAYS: 90,
  MOBILE_READ_PURGE_DAYS: 30,
  LIST_LIMIT: 30,
  MOBILE_LIST_LIMIT: 50,
  PURGE_BATCH_SIZE: 1000,
  PURGE_MAX_BATCHES: 20,
} as const;

export type NotificationCutoffs = {
  /** Notifikasi dengan createdAt sebelum ini tidak lagi ditampilkan. */
  visibleSince: Date;
  /** Notifikasi dengan createdAt sebelum ini dihapus permanen. */
  purgeBefore: Date;
  /** Notifikasi mobile yang sudah dibaca dan dibuat sebelum ini dihapus permanen. */
  mobileReadPurgeBefore: Date;
};

export function notificationCutoffs(now: Date = new Date()): NotificationCutoffs {
  const t = now.getTime();
  return {
    visibleSince: new Date(t - NOTIFICATION_RETENTION.VISIBLE_DAYS * DAY_MS),
    purgeBefore: new Date(t - NOTIFICATION_RETENTION.PURGE_DAYS * DAY_MS),
    mobileReadPurgeBefore: new Date(t - NOTIFICATION_RETENTION.MOBILE_READ_PURGE_DAYS * DAY_MS),
  };
}
