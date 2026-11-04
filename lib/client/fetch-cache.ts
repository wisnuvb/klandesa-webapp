/**
 * Lapisan data klien ringan: dedupe permintaan GET JSON + cache memori per-tab dengan stale-while-revalidate.
 * Modul murni (tanpa React/DOM); waktu dan `fetch` bisa diinjeksi lewat `createFetchCache` agar bisa dites deterministik.
 *
 * Perilaku:
 * - Dedupe: GET ke URL yang sama yang sedang berjalan dipakai bersama (satu request jaringan).
 * - Cache (OPT-IN per panggilan): `ttlMs` = data dianggap segar (tanpa request). `staleMs` = jendela SETELAH TTL: data basi
 *   dikembalikan seketika sambil revalidasi di latar belakang; hasilnya diumumkan lewat `subscribe`. Tanpa `ttlMs`/`staleMs`
 *   tidak ada yang disimpan lintas panggilan (semantik `cache: "no-store"` lama; hanya dedupe serentak).
 * - Hanya respons sukses (`res.ok`, badan JSON terbaca) yang disimpan. Galat HTTP dan galat jaringan tidak pernah di-cache.
 * - Hanya GET. Metode lain langsung diteruskan ke `fetch` tanpa cache/dedupe.
 * - `/api/account/permissions` TIDAK PERNAH di-cache atau dibagi antar-pemanggil (izin harus selalu segar).
 * - Yang disimpan adalah TEKS respons; tiap pemanggil mem-parse sendiri, jadi tidak ada objek yang dibagi antar-komponen
 *   (komponen yang memutasi data di tempat tidak merusak pemanggil lain).
 *
 * KEAMANAN ANTAR-AKUN (cache tidak boleh bocor ke akun lain di tab yang sama). Tiga lapis:
 * 1. Setiap entri cache dan request yang berjalan diberi label SCOPE (mis. "village:12"). Entri hanya dipakai bila scope-nya
 *    sama dengan scope aktif.
 * 2. `setFetchCacheScope(scope)` dipanggil gerbang shell saat identitas sesi berubah (login/logout/ganti akun); bila scope
 *    berubah, seluruh cache dan dedupe dikosongkan dan "generasi" dinaikkan.
 * 3. Request yang MULAI sebelum perubahan scope/`clear()` tidak boleh menulis hasilnya ke cache (dicek lewat generasi) dan
 *    tidak lagi dibagikan ke pemanggil baru. Jadi respons akun lama yang terlambat tiba tidak masuk ke cache akun baru.
 * Cache ada di memori modul (per tab, hilang saat muat ulang penuh); tidak ada localStorage/sessionStorage.
 */

export type FetchJsonOptions = {
  /** Data lebih muda dari ini dianggap segar: dikembalikan tanpa request. Bawaan 0 (tanpa cache). */
  ttlMs?: number;
  /** Jendela SETELAH ttl: data basi dikembalikan seketika + revalidasi latar belakang. Bawaan 0. */
  staleMs?: number;
  /** Lewati cache dan JANGAN ikut request yang sedang berjalan (mis. `reload()` setelah mutasi). Hasilnya tetap boleh disimpan. */
  force?: boolean;
  /** Batalkan penantian pemanggil INI saja (request bersama tidak dibatalkan karena pemanggil lain mungkin masih menunggu). */
  signal?: AbortSignal;
  /** Selain GET: diteruskan apa adanya tanpa cache/dedupe. */
  method?: string;
};

export type FetchJsonResult<T> = {
  ok: boolean;
  status: number;
  /** Badan JSON hasil parse (null bila bukan JSON). Objek baru untuk setiap pemanggil. */
  body: T | null;
  /** "network" = baru dari jaringan; "fresh"/"stale" = dari cache. */
  source: "network" | "fresh" | "stale";
  /** Penanda versi entri (naik tiap respons jaringan); pelanggan bisa membuang pembaruan yang sudah dikenal. */
  stamp: number;
};

export type FetchCacheListener = (result: FetchJsonResult<unknown>) => void;

export type FetchCacheDeps = {
  fetch?: typeof fetch;
  now?: () => number;
};

/** Jalur yang tidak boleh di-cache/dibagi sama sekali. Dicocokkan pada pathname (tanpa query/host). */
const NEVER_CACHE_PATHS: RegExp[] = [/^\/api\/account\/permissions\/?$/];

function pathOf(url: string): string {
  const noHash = url.split("#")[0];
  const q = noHash.indexOf("?");
  let p = q === -1 ? noHash : noHash.slice(0, q);
  const m = /^[a-z][a-z0-9+.-]*:\/\/[^/]+(\/.*)?$/i.exec(p);
  if (m) p = m[1] ?? "/";
  return p;
}

export function isNeverCached(url: string): boolean {
  const p = pathOf(url);
  return NEVER_CACHE_PATHS.some((re) => re.test(p));
}

type Entry = { scope: string; text: string; status: number; at: number; stamp: number };
type Inflight = {
  promise: Promise<{ text: string | null; status: number; ok: boolean; stamp: number }>;
  scope: string;
  generation: number;
  /** Umur hidup terpanjang (ttl+stale) yang diminta pemanggil mana pun; 0 = jangan simpan. */
  keepMs: number;
  /** true bila di-invalidate saat berjalan: hasilnya tidak boleh disimpan. */
  dropped: boolean;
};

function abortError(): Error {
  const e = new Error("Aborted");
  e.name = "AbortError";
  return e;
}

function withSignal<T>(p: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return p;
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(abortError());
    signal.addEventListener("abort", onAbort, { once: true });
    p.then(
      (v) => {
        signal.removeEventListener("abort", onAbort);
        resolve(v);
      },
      (e) => {
        signal.removeEventListener("abort", onAbort);
        reject(e);
      },
    );
  });
}

function parse<T>(text: string | null): T | null {
  if (text == null || text === "") return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function createFetchCache(deps: FetchCacheDeps = {}) {
  const now = deps.now ?? (() => Date.now());
  // `fetch` dibaca saat dipanggil (bukan saat modul dimuat) supaya mock di `globalThis.fetch` ikut berlaku.
  const doFetch: typeof fetch = (input, init) => (deps.fetch ?? globalThis.fetch)(input, init);

  const entries = new Map<string, Entry>();
  const inflight = new Map<string, Inflight>();
  const listeners = new Map<string, Set<FetchCacheListener>>();
  let scope = "";
  let generation = 0;
  let stampCounter = 0;

  function notify(url: string, result: FetchJsonResult<unknown>) {
    const set = listeners.get(url);
    if (!set) return;
    for (const fn of [...set]) fn(result);
  }

  function start(url: string, keepMs: number): Inflight {
    // Request lama untuk URL ini (mis. kalah oleh `force`) tidak boleh menimpa hasil yang lebih baru.
    const prev = inflight.get(url);
    if (prev) prev.dropped = true;
    const rec: Inflight = {
      scope,
      generation,
      keepMs,
      dropped: false,
      promise: undefined as unknown as Inflight["promise"],
    };
    rec.promise = (async () => {
      try {
        const res = await doFetch(url, { cache: "no-store" });
        const text = await res.text().catch(() => null);
        const stamp = ++stampCounter;
        const valid = parse(text) !== null;
        const canStore =
          res.ok && valid && text !== null && rec.keepMs > 0 && !rec.dropped && rec.generation === generation && rec.scope === scope;
        if (canStore) {
          entries.set(url, { scope: rec.scope, text: text as string, status: res.status, at: now(), stamp });
          notify(url, { ok: true, status: res.status, body: parse(text), source: "network", stamp });
        }
        return { text, status: res.status, ok: res.ok, stamp };
      } finally {
        if (inflight.get(url) === rec) inflight.delete(url);
      }
    })();
    inflight.set(url, rec);
    return rec;
  }

  function toResult<T>(
    r: { text: string | null; status: number; ok: boolean; stamp: number },
    source: FetchJsonResult<T>["source"],
  ): FetchJsonResult<T> {
    return { ok: r.ok, status: r.status, body: parse<T>(r.text), source, stamp: r.stamp };
  }

  /** Entri yang masih boleh dipakai di scope aktif (selain itu dibuang). */
  function readEntry(url: string): Entry | null {
    const e = entries.get(url);
    if (!e) return null;
    if (e.scope !== scope) {
      entries.delete(url);
      return null;
    }
    return e;
  }

  function revalidate(url: string, keepMs: number) {
    const existing = inflight.get(url);
    if (existing && existing.scope === scope && existing.generation === generation) {
      existing.keepMs = Math.max(existing.keepMs, keepMs);
      return;
    }
    // Galat latar belakang diam: data basi tetap dipakai.
    start(url, keepMs).promise.catch(() => undefined);
  }

  async function fetchJson<T = unknown>(url: string, opts: FetchJsonOptions = {}): Promise<FetchJsonResult<T>> {
    const method = (opts.method ?? "GET").toUpperCase();
    if (method !== "GET" || isNeverCached(url)) {
      // Tanpa cache dan tanpa dedupe; sinyal pemanggil diteruskan langsung ke fetch.
      const res = await doFetch(url, { cache: "no-store", method, signal: opts.signal });
      const text = await res.text().catch(() => null);
      return { ok: res.ok, status: res.status, body: parse<T>(text), source: "network", stamp: ++stampCounter };
    }

    const ttl = Math.max(0, opts.ttlMs ?? 0);
    const stale = Math.max(0, opts.staleMs ?? 0);
    const keepMs = ttl + stale;

    if (!opts.force && keepMs > 0) {
      const e = readEntry(url);
      if (e) {
        const age = now() - e.at;
        const asResult = (source: "fresh" | "stale"): FetchJsonResult<T> => ({
          ok: true,
          status: e.status,
          body: parse<T>(e.text),
          source,
          stamp: e.stamp,
        });
        if (age < ttl) return asResult("fresh");
        if (age < keepMs) {
          revalidate(url, keepMs);
          return asResult("stale");
        }
      }
    }

    let rec = opts.force ? undefined : inflight.get(url);
    if (rec && (rec.scope !== scope || rec.generation !== generation)) rec = undefined;
    if (rec) rec.keepMs = Math.max(rec.keepMs, keepMs);
    else rec = start(url, keepMs);

    const r = await withSignal(rec.promise, opts.signal);
    return toResult<T>(r, "network");
  }

  /** Baca cache tanpa jaringan (mis. untuk render awal tanpa kedipan). null bila tidak ada/kedaluwarsa total. */
  function peek<T = unknown>(url: string, opts: Pick<FetchJsonOptions, "ttlMs" | "staleMs"> = {}): FetchJsonResult<T> | null {
    if (isNeverCached(url)) return null;
    const ttl = Math.max(0, opts.ttlMs ?? 0);
    const keep = ttl + Math.max(0, opts.staleMs ?? 0);
    if (keep <= 0) return null;
    const e = readEntry(url);
    if (!e) return null;
    const age = now() - e.at;
    if (age >= keep) return null;
    return { ok: true, status: e.status, body: parse<T>(e.text), source: age < ttl ? "fresh" : "stale", stamp: e.stamp };
  }

  /** Dipanggil saat respons jaringan BARU tersimpan untuk `url` (mis. revalidasi latar belakang selesai). */
  function subscribe(url: string, fn: FetchCacheListener): () => void {
    let set = listeners.get(url);
    if (!set) listeners.set(url, (set = new Set()));
    set.add(fn);
    return () => {
      set!.delete(fn);
      if (set!.size === 0 && listeners.get(url) === set) listeners.delete(url);
    };
  }

  /** Hapus entri yang URL-nya diawali `urlOrPrefix` (juga request berjalan: hasilnya tidak akan disimpan/dibagi lagi). */
  function invalidate(urlOrPrefix: string): void {
    for (const k of [...entries.keys()]) if (k.startsWith(urlOrPrefix)) entries.delete(k);
    for (const [k, rec] of [...inflight.entries()]) {
      if (!k.startsWith(urlOrPrefix)) continue;
      rec.dropped = true;
      inflight.delete(k);
    }
  }

  /** Kosongkan semuanya (cache, dedupe) dan naikkan generasi: request lama tidak boleh menulis ke cache lagi. */
  function clear(): void {
    entries.clear();
    for (const rec of inflight.values()) rec.dropped = true;
    inflight.clear();
    generation++;
  }

  /** Ganti identitas pemilik cache. Berubah -> `clear()`. Sama -> tidak ada efek (aman dipanggil berulang). */
  function setScope(next: string): void {
    if (next === scope) return;
    scope = next;
    clear();
  }

  return { fetchJson, peek, subscribe, invalidate, clear, setScope, getScope: () => scope };
}

/** Instans bersama per tab. */
const shared = createFetchCache();

/** GET JSON dengan dedupe + cache opt-in (lihat catatan di atas). Lempar galat jaringan; respons non-OK dikembalikan (ok=false). */
export const fetchJsonDeduped = shared.fetchJson;
export const peekFetchCache = shared.peek;
export const subscribeFetchCache = shared.subscribe;
export const invalidateFetchCache = shared.invalidate;
export const clearFetchCache = shared.clear;
export const setFetchCacheScope = shared.setScope;
