/**
 * Validasi unggahan gambar blog (murni, tanpa dependensi). Tipe ditentukan dari ISI berkas
 * (magic bytes), bukan dari Content-Type/nama berkas yang dikirim klien. SVG sengaja tidak
 * diizinkan: SVG bisa memuat skrip dan dilayani dari domain penyimpanan kita.
 */

export const BLOG_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export type BlogImageType = { mime: "image/jpeg" | "image/png" | "image/webp"; ext: "jpg" | "png" | "webp" };

/** Tipe gambar dari byte awal berkas; null bila bukan JPEG/PNG/WebP. */
export function sniffImageType(bytes: Uint8Array): BlogImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return { mime: "image/png", ext: "png" };
  }
  // WebP: "RIFF" <ukuran 4 byte> "WEBP"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}

/** Kunci objek: `blog/<tahun>/<bulan>/<uuid>.<ext>` — nama asli klien tidak pernah dipakai. */
export function blogImageKey(ext: BlogImageType["ext"], uuid: string, now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `blog/${y}/${m}/${uuid}.${ext}`;
}

/** Pola kunci unggahan blog: `blog/<tahun>/<bulan>/<uuid>.<ext>`. */
const BLOG_KEY_RE = /^blog\/\d{4}\/\d{2}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

/**
 * Kunci objek dari URL publik gambar blog kita. Hanya URL di bawah `cdnBaseUrl` dengan pola
 * `blog/YYYY/MM/<uuid>.(jpg|png|webp)` yang dikenali; selain itu (Unsplash, host lain, `..`,
 * query/fragmen, folder lain) → null, sehingga tidak pernah ada penghapusan di luar folder blog.
 */
export function blogKeyFromUrl(url: string, cdnBaseUrl: string): string | null {
  if (typeof url !== "string" || !url || url.includes("..") || /[?#\\%]/.test(url)) return null;
  const base = cdnBaseUrl.replace(/\/+$/, "") + "/";
  if (!url.startsWith(base)) return null;
  const key = url.slice(base.length);
  return BLOG_KEY_RE.test(key) ? key : null;
}

/**
 * Semua URL gambar blog kita (di bawah `cdnBaseUrl`, pola blog/YYYY/MM/uuid.ext) yang muncul di teks Markdown,
 * baik sebagai gambar `![alt](url)`, tautan, maupun URL polos. Urutan kemunculan, tanpa duplikat.
 */
export function findBlogImageUrls(text: string, cdnBaseUrl: string): string[] {
  if (!text) return [];
  const base = cdnBaseUrl.replace(/\/+$/, "");
  const esc = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `${esc}/blog/\\d{4}/\\d{2}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(?:jpg|png|webp)(?![\\w.%/-])`,
    "gi",
  );
  const found = new Set<string>();
  for (const m of text.matchAll(re)) found.add(m[0]);
  return [...found].filter((u) => blogKeyFromUrl(u, cdnBaseUrl) !== null);
}

/** URL gambar blog yang ada di `before` tetapi sudah tidak ada di `after`. */
export function removedBlogImageUrls(before: string | null | undefined, after: string | null | undefined, cdnBaseUrl: string): string[] {
  const kept = new Set(findBlogImageUrls(after ?? "", cdnBaseUrl));
  return findBlogImageUrls(before ?? "", cdnBaseUrl).filter((u) => !kept.has(u));
}

/** Batas byte nyata untuk body multipart: berkas maksimal + overhead boundary/header field. */
export const BLOG_UPLOAD_BODY_LIMIT = BLOG_IMAGE_MAX_BYTES + 64 * 1024;

export class BodyTooLargeError extends Error {
  constructor() {
    super("body terlalu besar");
    this.name = "BodyTooLargeError";
  }
}

/**
 * Baca stream body dengan batas byte NYATA (bukan hanya header Content-Length yang bisa berbohong).
 * Melempar BodyTooLargeError begitu total melebihi `limit` dan membatalkan stream.
 */
export async function readBodyWithLimit(body: ReadableStream<Uint8Array> | null, limit: number): Promise<Uint8Array> {
  if (!body) return new Uint8Array();
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel().catch(() => undefined);
      throw new BodyTooLargeError();
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return out;
}
