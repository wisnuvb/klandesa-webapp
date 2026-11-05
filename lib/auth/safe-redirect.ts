/**
 * Tujuan kembali setelah login (`callbackUrl`) berasal dari URL yang bisa dibuat siapa saja, jadi hanya path INTERNAL
 * yang boleh dipakai. Menolak awalan "//" saja tidak cukup: browser memperlakukan "\" seperti "/" ("/\evil.com" menjadi
 * "//evil.com"), dan karakter kontrol (tab/newline) dibuang parser URL ("/\t/evil.com"). Hasilnya dinormalisasi lewat
 * `new URL` dan harus tetap satu origin.
 */
const BASE = "http://internal.invalid";

export function safeInternalPath(raw: string | null | undefined, fallback = "/dashboard"): string {
  if (typeof raw !== "string") return fallback;
  const v = raw.trim();
  if (!v.startsWith("/") || v.startsWith("//")) return fallback;
  if (/[\\\u0000-\u001f\u007f]/.test(v)) return fallback;
  try {
    const u = new URL(v, BASE);
    if (u.origin !== BASE) return fallback;
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return fallback;
  }
}
