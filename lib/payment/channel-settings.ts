/**
 * Status kanal pembayaran yang diatur admin platform (tabel payment_channel_settings).
 * Dibaca di setiap checkout dan pemuatan dialog pembayaran, jadi diberi cache pendek.
 * FAIL-OPEN: bila tabel belum ada / database bermasalah, semua kanal dianggap aktif (pembayaran tidak boleh ikut mati
 * hanya karena pengaturan tambahan tidak terbaca).
 */
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const CHANNEL_SETTINGS_CACHE_MS = 15_000;

type CacheEntry = { at: number; disabled: ReadonlySet<string> };
const cache = ((globalThis as { __linkquChannelSettings?: { entry: CacheEntry | null } }).__linkquChannelSettings ??= {
  entry: null,
});

/** Kode kanal yang sedang dimatikan admin. */
export async function getAdminDisabledChannels(now = Date.now()): Promise<ReadonlySet<string>> {
  if (cache.entry && now - cache.entry.at < CHANNEL_SETTINGS_CACHE_MS) return cache.entry.disabled;
  try {
    const rows = await prisma.paymentChannelSetting.findMany({ where: { enabled: false }, select: { code: true } });
    const disabled = new Set(rows.map((r) => r.code));
    cache.entry = { at: now, disabled };
    return disabled;
  } catch (error) {
    logger.error({ err: error }, "[LinkQu] Gagal membaca payment_channel_settings; semua kanal dianggap aktif");
    // Jangan men-cache kegagalan terlalu lama, tapi cegah badai kueri saat database bermasalah.
    const empty: ReadonlySet<string> = new Set();
    cache.entry = { at: now - CHANNEL_SETTINGS_CACHE_MS + 3_000, disabled: empty };
    return empty;
  }
}

/** Panggil setelah admin mengubah pengaturan agar perubahan langsung berlaku di proses ini. */
export function invalidateChannelSettings() {
  cache.entry = null;
}

/** Catat penolakan "kanal tidak aktif" dari LinkQu (hanya untuk ditampilkan di panel admin; tidak mengubah `enabled`). */
export async function recordChannelFailure(code: string, message: string): Promise<void> {
  try {
    const lastError = message.slice(0, 250);
    await prisma.paymentChannelSetting.upsert({
      where: { code },
      create: { code, enabled: true, lastError, lastErrorAt: new Date() },
      update: { lastError, lastErrorAt: new Date() },
    });
  } catch (error) {
    logger.warn({ err: error, code }, "[LinkQu] Gagal mencatat kegagalan kanal");
  }
}
