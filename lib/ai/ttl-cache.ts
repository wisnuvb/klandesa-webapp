/**
 * Cache TTL kecil di memori (per proses). Permintaan serentak untuk kunci yang sama berbagi satu pemuatan, dan kegagalan
 * tidak disimpan. PM2 cluster = satu cache per worker; cukup karena yang disimpan hanya ringkasan yang boleh agak basi.
 */
export type TtlCache<K, V> = {
  get: (key: K, loader: () => Promise<V>) => Promise<V>;
  clear: () => void;
  size: () => number;
};

export function createTtlCache<K, V>(opts: { ttlMs: number; max: number; now?: () => number }): TtlCache<K, V> {
  const now = opts.now ?? Date.now;
  const store = new Map<K, { at: number; value: Promise<V> }>();

  function evict() {
    const t = now();
    for (const [k, v] of store) if (t - v.at >= opts.ttlMs) store.delete(k);
    // Masih penuh: buang yang tertua (Map mempertahankan urutan sisip).
    while (store.size >= opts.max) {
      const oldest = store.keys().next();
      if (oldest.done) break;
      store.delete(oldest.value);
    }
  }

  return {
    get(key, loader) {
      const hit = store.get(key);
      if (hit && now() - hit.at < opts.ttlMs) return hit.value;
      if (store.size >= opts.max) evict();
      const value = loader();
      const entry = { at: now(), value };
      store.set(key, entry);
      // Kegagalan tidak di-cache (hanya hapus bila entri itu masih yang sama).
      value.catch(() => {
        if (store.get(key) === entry) store.delete(key);
      });
      return value;
    },
    clear: () => store.clear(),
    size: () => store.size,
  };
}
