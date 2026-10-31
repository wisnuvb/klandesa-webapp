/**
 * Pengaman tujuan webhook (SSRF): server kita akan memanggil alamat yang dimasukkan pengguna, jadi alamat yang menuju
 * jaringan internal (localhost, LAN, metadata cloud) HARUS ditolak. Pemeriksaan dilakukan dua kali:
 *  1. saat alamat didaftarkan (`validateWebhookUrl`, termasuk alamat IP langsung),
 *  2. saat tersambung (`guardedLookup`), memeriksa IP hasil DNS yang benar-benar dipakai, sehingga DNS-rebinding gagal.
 */
import dns from "node:dns";
import net from "node:net";

const MAX_URL_LENGTH = 500;
const BLOCKED_HOST_SUFFIXES = [".local", ".localhost", ".internal", ".localdomain", ".lan", ".home", ".corp"];

function ipv4ToInt(ip: string): number | null {
  const p = ip.split(".");
  if (p.length !== 4) return null;
  let n = 0;
  for (const part of p) {
    if (!/^\d{1,3}$/.test(part) || Number(part) > 255) return null;
    n = n * 256 + Number(part);
  }
  return n;
}

const V4_BLOCKS: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["192.88.99.0", 24],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

function inV4Block(n: number, base: string, bits: number): boolean {
  const b = ipv4ToInt(base)!;
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return ((n & mask) >>> 0) === ((b & mask) >>> 0);
}

/** Uraikan IPv6 menjadi 8 kelompok 16-bit; null bila bukan IPv6 sah. */
function expandIPv6(ip: string): number[] | null {
  let s = ip.split("%")[0].toLowerCase();
  const lastColon = s.lastIndexOf(":");
  const tail = s.slice(lastColon + 1);
  if (tail.includes(".")) {
    const n = ipv4ToInt(tail);
    if (n == null) return null;
    s = `${s.slice(0, lastColon + 1)}${(n >>> 16).toString(16)}:${(n & 0xffff).toString(16)}`;
  }
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const rest = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const fill = halves.length === 2 ? 8 - head.length - rest.length : 0;
  if (fill < 0 || (halves.length === 1 && head.length !== 8)) return null;
  const groups = [...head, ...Array(fill).fill("0"), ...rest];
  if (groups.length !== 8) return null;
  const out = groups.map((g) => (/^[0-9a-f]{1,4}$/.test(g) ? parseInt(g, 16) : NaN));
  return out.some(Number.isNaN) ? null : out;
}

/** true bila alamat IP menuju jaringan non-publik (atau tidak bisa dipastikan publik). */
export function isBlockedIp(ip: string): boolean {
  const kind = net.isIP(ip);
  if (kind === 4) {
    const n = ipv4ToInt(ip);
    return n == null || V4_BLOCKS.some(([base, bits]) => inV4Block(n, base, bits));
  }
  if (kind === 6) {
    const g = expandIPv6(ip);
    if (!g) return true;
    const allZeroTo = (k: number) => g.slice(0, k).every((x) => x === 0);
    if (allZeroTo(7) && (g[7] === 0 || g[7] === 1)) return true; // :: dan ::1
    if (allZeroTo(5) && g[5] === 0xffff) return isBlockedIp(`${g[6] >>> 8}.${g[6] & 255}.${g[7] >>> 8}.${g[7] & 255}`); // ::ffff:a.b.c.d
    if (allZeroTo(5) && g[5] === 0) return true; // ::a.b.c.d (IPv4-compatible, usang)
    if (g[0] === 0x64 && g[1] === 0xff9b) return true; // NAT64
    if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 (unique local)
    if ((g[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 (link-local)
    if ((g[0] & 0xff00) === 0xff00) return true; // multicast
    if (g[0] === 0x2001 && g[1] === 0x0db8) return true; // dokumentasi
    if (g[0] === 0x2002) return true; // 6to4 (memuat IPv4 terselip)
    if (g[0] === 0x2001 && g[1] === 0) return true; // Teredo
    // Daftar-izin: hanya unicast global 2000::/3 yang dianggap publik (fec0::/10, 100::/64, SIIT, dll. ditolak).
    return (g[0] & 0xe000) !== 0x2000;
  }
  return true;
}

export type UrlCheck = { ok: true; url: URL } | { ok: false; error: string };

/** Http polos hanya untuk pengembangan lokal; di produksi wajib https. */
const allowInsecure = () => process.env.NODE_ENV !== "production";

export function validateWebhookUrl(raw: unknown): UrlCheck {
  if (typeof raw !== "string" || !raw.trim()) return { ok: false, error: "Isi alamat tujuan." };
  const text = raw.trim();
  if (text.length > MAX_URL_LENGTH) return { ok: false, error: "Alamat terlalu panjang." };
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return { ok: false, error: "Alamat tidak valid. Contoh: https://contoh.id/webhook" };
  }
  if (url.protocol !== "https:" && !(url.protocol === "http:" && allowInsecure())) return { ok: false, error: "Alamat harus diawali https://" };
  if (url.username || url.password) return { ok: false, error: "Alamat tidak boleh memuat nama pengguna atau kata sandi." };
  if (url.hash) return { ok: false, error: "Alamat tidak boleh memuat tanda #." };
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase().replace(/\.$/, "");
  if (!host) return { ok: false, error: "Alamat tidak valid." };
  if (net.isIP(host)) {
    if (isBlockedIp(host)) return { ok: false, error: "Alamat ini mengarah ke jaringan internal dan tidak diizinkan." };
  } else if (host === "localhost" || BLOCKED_HOST_SUFFIXES.some((s) => host.endsWith(s)) || !host.includes(".")) {
    return { ok: false, error: "Alamat ini mengarah ke jaringan internal dan tidak diizinkan." };
  }
  return { ok: true, url };
}

export class BlockedAddressError extends Error {
  code = "EBLOCKEDADDR";
  constructor() {
    super("Alamat mengarah ke jaringan internal");
  }
}

/** `lookup` untuk http(s).request: tolak bila ADA hasil DNS yang non-publik. */
export function guardedLookup(hostname: string, options: dns.LookupOptions | number, cb: (err: NodeJS.ErrnoException | null, address?: string | dns.LookupAddress[], family?: number) => void): void {
  const opts = typeof options === "number" ? { family: options } : options;
  dns.lookup(hostname, { ...opts, all: true, verbatim: true }, (err, addrs) => {
    if (err) return cb(err);
    if (!addrs.length || addrs.some((a) => isBlockedIp(a.address))) return cb(new BlockedAddressError());
    if (opts.all) return cb(null, addrs);
    cb(null, addrs[0].address, addrs[0].family);
  });
}

/** Alamat tanpa kueri (token sering diselipkan di sana); untuk jejak audit. */
export function safeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    return `${u.origin}${u.pathname}${u.search ? "?…" : ""}`;
  } catch {
    return "(alamat tidak valid)";
  }
}
