/**
 * Host gambar yang boleh diproses `/_next/image`. Dulu `hostname: "**"`: siapa pun bisa meminta server mengunduh dan
 * mentranskode gambar dari host mana pun (boros CPU/bandwidth, bisa disalahgunakan). Sekarang hanya penyimpanan kita sendiri
 * dan beberapa sumber yang memang dipakai. Murni (menerima env) agar bisa dites; dipakai oleh next.config.ts.
 *
 * Sumber: penyimpanan objek DigitalOcean Spaces (lib/spaces.ts: bucket/CDN dari env), Unsplash (blog admin),
 * domain Klandesa. Host tambahan tanpa ubah kode: NEXT_IMAGE_REMOTE_HOSTS="cdn.contoh.id,**.contoh.net" (saat build).
 */
export type ImageRemotePattern = { protocol: "https" | "http"; hostname: string; port?: string };

const hostOf = (raw: string | undefined): string | null => {
  const v = raw?.trim();
  if (!v) return null;
  try {
    return new URL(/^[a-z]+:\/\//i.test(v) ? v : `https://${v}`).hostname.toLowerCase() || null;
  } catch {
    return null;
  }
};

/** Host tetap (tidak bergantung env) — selalu ada di remotePatterns, sehingga aman dipakai next/image tanpa risiko "host belum dikonfigurasi". */
export const STATIC_IMAGE_HOSTS: readonly string[] = [
  "**.digitaloceanspaces.com", // bucket Spaces & CDN bawaannya (https://<bucket>.<region>[.cdn].digitaloceanspaces.com)
  "images.unsplash.com",
  "klandesa.com",
  "**.klandesa.com",
];

/**
 * Apakah URL gambar pasti boleh diproses `/_next/image`? Hanya mencocokkan host tetap (bukan yang dari env
 * saat build). Jawaban false = pakai <img> biasa; memanggil next/image untuk host yang tak terdaftar melempar error.
 */
export function isStaticOptimizableImageUrl(url: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || u.port) return false;
  const host = u.hostname.toLowerCase();
  return STATIC_IMAGE_HOSTS.some((p) =>
    p.startsWith("**.") ? host.endsWith(p.slice(2)) && host.length > p.length - 2 : host === p,
  );
}

export function buildImageRemotePatterns(env: Record<string, string | undefined>): ImageRemotePattern[] {
  const hosts = new Set<string>(STATIC_IMAGE_HOSTS);
  for (const raw of [env.SPACES_CDN_BASE_URL, env.SPACES_ENDPOINT]) {
    const h = hostOf(raw);
    if (h) hosts.add(h);
  }
  for (const raw of (env.NEXT_IMAGE_REMOTE_HOSTS ?? "").split(",")) {
    const h = raw.trim().toLowerCase();
    // Tolak pola yang mengizinkan semuanya, apa pun cara penulisannya.
    if (h && h !== "*" && h !== "**" && !/^\*\*?\.?$/.test(h) && /^[a-z0-9*.-]+$/.test(h)) hosts.add(h);
  }
  const patterns: ImageRemotePattern[] = [...hosts].map((hostname) => ({ protocol: "https", hostname }));
  if (env.NODE_ENV !== "production") patterns.push({ protocol: "http", hostname: "localhost" });
  return patterns;
}
