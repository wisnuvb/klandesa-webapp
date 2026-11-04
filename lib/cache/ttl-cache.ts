/**
 * Cache memori per proses dengan TTL singkat + single-flight.
 *
 * Dipakai untuk pekerjaan yang MAHAL, hasilnya sama untuk semua pengguna satu desa, dan boleh basi beberapa detik
 * (ringkasan dashboard, sinkronisasi notifikasi). JANGAN dipakai untuk keputusan izin/keamanan: PM2 menjalankan
 * banyak worker dan cache ini tidak dibagi antarproses, jadi pembatalan tidak bisa dijamin serentak.
 *
 * - Permintaan serentak untuk kunci yang sama menunggu satu pemuatan (tidak menggandakan query).
 * - Pemuatan yang gagal tidak disimpan (permintaan berikutnya mencoba lagi).
 * - Jumlah entri dibatasi (yang terlama dibuang) agar memori worker tidak tumbuh tanpa batas.
 */
export type TtlCache<K, V> = {
  getOrLoad(key: K, loader: () => Promise<V>): Promise<V>;
  /** Buang satu kunci (mis. setelah penulisan yang hasilnya harus langsung terlihat). */
  invalidate(key: K): void;
  clear(): void;
  readonly size: number;
};

export function createTtlCache<K, V>(opts: { ttlMs: number; maxEntries?: number; now?: () => number }): TtlCache<K, V> {
  const { ttlMs, maxEntries = 2000 } = opts;
  const now = opts.now ?? Date.now;
  const done = new Map<K, { value: V; expiresAt: number }>();
  const inflight = new Map<K, Promise<V>>();

  return {
    async getOrLoad(key, loader) {
      const hit = done.get(key);
      if (hit && hit.expiresAt > now()) return hit.value;
      if (hit) done.delete(key);

      const pending = inflight.get(key);
      if (pending) return pending;

      const p = loader()
        .then((value) => {
          // Urutan sisip = urutan umur, jadi entri pertama Map selalu yang terlama.
          done.delete(key);
          done.set(key, { value, expiresAt: now() + ttlMs });
          while (done.size > maxEntries) {
            const oldest = done.keys().next();
            if (oldest.done) break;
            done.delete(oldest.value);
          }
          return value;
        })
        .finally(() => {
          inflight.delete(key);
        });
      inflight.set(key, p);
      return p;
    },
    invalidate(key) {
      done.delete(key);
    },
    clear() {
      done.clear();
    },
    get size() {
      return done.size;
    },
  };
}
