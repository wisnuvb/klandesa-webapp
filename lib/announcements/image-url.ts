/**
 * Validasi `imageUrl` pengumuman (flyer/foto). Hanya URL http(s) yang diterima agar `src` gambar di
 * situs publik dan aplikasi mobile tidak bisa diisi skema lain. `undefined` = tidak diubah, `null` = hapus.
 */
export const ANNOUNCEMENT_IMAGE_URL_MAX = 2000;

export type ImageUrlResult = { ok: true; value: string | null | undefined } | { ok: false; error: string };

export function parseAnnouncementImageUrl(raw: unknown): ImageUrlResult {
  if (raw === undefined) return { ok: true, value: undefined };
  if (raw === null) return { ok: true, value: null };
  if (typeof raw !== "string") return { ok: false, error: "Alamat gambar tidak valid." };
  const v = raw.trim();
  if (v === "") return { ok: true, value: null };
  if (v.length > ANNOUNCEMENT_IMAGE_URL_MAX) return { ok: false, error: "Alamat gambar terlalu panjang." };
  try {
    const u = new URL(v);
    if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("skema");
  } catch {
    return { ok: false, error: "Alamat gambar harus berupa URL http(s)." };
  }
  return { ok: true, value: v };
}
