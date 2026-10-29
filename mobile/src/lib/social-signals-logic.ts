/** Logika murni pencatat sinyal Warga (tanpa jaringan). Lihat social-signals.ts dan docs/SOCIAL_FEED_RANKING.md. */

export type FeedSrc = 'forYou' | 'latest';
export type SignalEvent = { postId: number; type: 'seen' | 'open' | 'share' | 'hide' | 'unhide'; src: FeedSrc; ms?: number };

/** Sama dengan batas server (MAX_SIGNAL_EVENTS). */
export const MAX_BATCH = 40;
/** Tertahan kurang dari ini tidak dicatat (hanya lewat saat menggulir). Sama dengan SEEN_MIN_MS di server. */
export const SEEN_MIN_MS = 1000;

/**
 * Gabungkan kejadian ke antrean. Kejadian "tampil" yang terlalu singkat dibuang. Bila antrean penuh, yang paling lama
 * dibuang: pencatatan bersifat tambahan dan tidak boleh menumpuk di memori.
 */
export function enqueue(queue: SignalEvent[], e: SignalEvent, max = MAX_BATCH * 3): SignalEvent[] {
  if (e.type === 'seen' && (e.ms ?? 0) < SEEN_MIN_MS) return queue;
  const next = [...queue, e];
  return next.length > max ? next.slice(next.length - max) : next;
}

/** Pecah antrean menjadi paket-paket seukuran batas server. */
export function batches(queue: SignalEvent[], size = MAX_BATCH): SignalEvent[][] {
  const out: SignalEvent[][] = [];
  for (let i = 0; i < queue.length; i += size) out.push(queue.slice(i, i + size));
  return out;
}
