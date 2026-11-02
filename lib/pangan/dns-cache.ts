/**
 * Cache DNS di dalam proses untuk klien SP2KP.
 *
 * Latar (terukur 2026-11-02 dari VPS produksi): record A api-sp2kp.kemendag.go.id ber-TTL 30 detik, dan
 * satu-satunya resolver server (milik hosting) sering macet 5–20 detik tiap kali cache habis, padahal
 * TCP+TLS setelahnya hanya ±60 ms. Akibatnya permintaan acak terasa 5/10/15/20 detik atau gagal.
 *
 * Strategi: alamat terakhir yang berhasil dipakai SEGERA (mengabaikan TTL sumber), lalu disegarkan di latar
 * belakang; resolusi sendiri berlomba antara resolver sistem dan resolver publik (siapa cepat menang).
 * Memakai c-ares (`dns.Resolver`), bukan getaddrinfo, jadi tidak menahan threadpool libuv saat macet.
 */
import dns from "node:dns";
import net from "node:net";
import type { LookupFunction } from "node:net";

export type ResolveFn = (host: string) => Promise<string[]>;

export type DnsCacheOptions = {
  resolve: ResolveFn;
  now?: () => number;
  /** Setelah umur ini, alamat tetap dipakai tetapi disegarkan di latar belakang. */
  refreshAfterMs?: number;
};

export function createDnsCache(opts: DnsCacheOptions) {
  const now = opts.now ?? Date.now;
  const refreshAfterMs = opts.refreshAfterMs ?? 60_000;
  const entries = new Map<string, { addrs: string[]; at: number }>();
  const pending = new Map<string, Promise<string[]>>();

  function resolveInto(host: string): Promise<string[]> {
    const existing = pending.get(host);
    if (existing) return existing;
    const p = opts
      .resolve(host)
      .then((addrs) => {
        if (addrs.length === 0) throw new Error(`DNS kosong untuk ${host}`);
        entries.set(host, { addrs, at: now() });
        return addrs;
      })
      .finally(() => pending.delete(host));
    pending.set(host, p);
    return p;
  }

  /** Alamat untuk host: dari cache bila ada (menyegarkan di latar belakang bila tua), selain itu menunggu resolusi. */
  async function get(host: string): Promise<string[]> {
    const e = entries.get(host);
    if (e) {
      if (now() - e.at >= refreshAfterMs) void resolveInto(host).catch(() => undefined);
      return e.addrs;
    }
    return resolveInto(host);
  }

  /** Minta penyegaran di latar belakang (mis. setelah gagal konek) tanpa membuang alamat lama. */
  function refresh(host: string): void {
    void resolveInto(host).catch(() => undefined);
  }

  const lookup = ((hostname: string, options: dns.LookupOptions | number, callback: (...args: unknown[]) => void) => {
    if (net.isIP(hostname)) {
      (dns.lookup as unknown as (...a: unknown[]) => void)(hostname, options, callback);
      return;
    }
    const wantAll = typeof options === "object" && options !== null && options.all === true;
    get(hostname).then(
      (addrs) => {
        const list = addrs.map((address) => ({ address, family: net.isIPv6(address) ? 6 : 4 }));
        if (wantAll) callback(null, list);
        else callback(null, list[0].address, list[0].family);
      },
      (err) => callback(err, "", 4),
    );
  }) as unknown as LookupFunction;

  return { get, refresh, lookup, size: () => entries.size };
}

/** Resolver bawaan: sistem + publik berlomba; yang pertama berhasil menang. */
export function createRacingResolver(env: Record<string, string | undefined> = process.env): ResolveFn {
  const publicServers = (env.PANGAN_DNS_SERVERS ?? "1.1.1.1,8.8.8.8")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const system = new dns.promises.Resolver({ timeout: 3000, tries: 1 });
  const pub = publicServers.length > 0 ? new dns.promises.Resolver({ timeout: 2500, tries: 1 }) : null;
  pub?.setServers(publicServers);

  return (host) => {
    const attempts: Promise<string[]>[] = [system.resolve4(host)];
    if (pub) attempts.push(pub.resolve4(host));
    return Promise.any(attempts);
  };
}

let shared: ReturnType<typeof createDnsCache> | null = null;

/** Cache bersama untuk seluruh klien SP2KP di proses ini. */
export function sharedDnsCache() {
  if (!shared) shared = createDnsCache({ resolve: createRacingResolver() });
  return shared;
}
