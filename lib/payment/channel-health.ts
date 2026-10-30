/**
 * Ingatan singkat tentang kanal LinkQu yang baru saja ditolak karena belum aktif / tidak didukung akun merchant.
 * Pengguna berikutnya tidak lagi melihat kanal itu sebagai pilihan, dan kanal dicoba lagi otomatis setelah TTL.
 * Disimpan di memori proses (cukup sebagai sinyal lunak; daftar tetap ada di LINKQU_DISABLED_CHANNELS).
 */
export const CHANNEL_HEALTH_TTL_MS = 10 * 60_000;

type Entry = { until: number; reason: string };
const store = ((globalThis as { __linkquChannelHealth?: Map<string, Entry> }).__linkquChannelHealth ??= new Map());

export function markChannelUnavailable(code: string, reason: string, now = Date.now(), ttlMs = CHANNEL_HEALTH_TTL_MS) {
  store.set(code, { until: now + ttlMs, reason });
}

export function markChannelHealthy(code: string) {
  store.delete(code);
}

/** Alasan kanal sedang ditandai bermasalah, atau null bila aman. */
export function channelUnavailableReason(code: string, now = Date.now()): string | null {
  const e = store.get(code);
  if (!e) return null;
  if (e.until <= now) {
    store.delete(code);
    return null;
  }
  return e.reason;
}

export function resetChannelHealth() {
  store.clear();
}

/**
 * Apakah penolakan LinkQu berarti KANALNYA yang tidak tersedia (bukan salah input pengguna)?
 * RC 43 = kanal belum diaktifkan; RC 99 "Bank Not Supported" terlihat pada probe sandbox. RC 01 "Parameter Not Valid"
 * sengaja tidak dihitung karena bisa berasal dari input kita sendiri.
 */
export function isChannelInactiveResponse(r: { response_code?: unknown; response_desc?: unknown } | null | undefined): boolean {
  if (!r) return false;
  const code = String(r.response_code ?? "").trim();
  const desc = String(r.response_desc ?? "");
  if (code === "43") return true;
  if (/not supported|tidak didukung|not active|belum aktif|maintenance|channel (is )?(closed|disabled)/i.test(desc)) return true;
  return false;
}
