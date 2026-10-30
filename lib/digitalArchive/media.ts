/**
 * Aturan aset gambar (media library) per desa. Murni, tanpa dependensi server,
 * sehingga dipakai bersama oleh route API (presign / pencatatan) dan modal pemilih gambar.
 */

/** Hanya format raster umum. SVG sengaja tidak diizinkan (bisa memuat skrip). */
export const MEDIA_IMAGE_MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const MAX_MEDIA_IMAGE_BYTES = 5 * 1024 * 1024;

/** Kategori arsip untuk gambar yang diunggah dari modal pemilih gambar. */
export const MEDIA_CATEGORY = "Aset Gambar";

export function normalizeMime(raw: string | null | undefined): string {
  return (raw || "").split(";")[0].trim().toLowerCase();
}

export function isAllowedImageMime(raw: string | null | undefined): boolean {
  return normalizeMime(raw) in MEDIA_IMAGE_MIME_EXT;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Pesan galat (Bahasa Indonesia) bila berkas tidak boleh diunggah sebagai aset gambar; null bila sah. */
export function validateImageFile(file: { type: string; size: number }): string | null {
  if (!isAllowedImageMime(file.type)) return "Format gambar harus JPG, PNG, WebP, atau GIF.";
  if (!Number.isFinite(file.size) || file.size <= 0) return "Berkas kosong.";
  if (file.size > MAX_MEDIA_IMAGE_BYTES) {
    return `Ukuran gambar terlalu besar. Maksimal ${formatBytes(MAX_MEDIA_IMAGE_BYTES)}.`;
  }
  return null;
}

/** Awalan key penyimpanan yang boleh dipakai satu desa untuk arsip digital. */
export function villageArchivePrefix(villageCode: string): string {
  return `villages/${villageCode}/digital-archives/`;
}

/**
 * Apakah key objek milik arsip desa ini. Dipakai sebagai pagar isolasi antar-desa di semua
 * tempat yang membaca / menghapus / mencatat objek berdasarkan key dari database atau klien.
 */
export function isVillageArchiveKey(key: unknown, villageCode: string): key is string {
  if (typeof key !== "string" || !villageCode || villageCode.includes("/")) return false;
  if (key.length === 0 || key.length > 600) return false;
  if (key.includes("..") || key.includes("\\") || key.includes("//")) return false;
  if (/[\u0000-\u001f\u007f]/.test(key)) return false;
  const prefix = villageArchivePrefix(villageCode);
  return key.startsWith(prefix) && key.length > prefix.length;
}

/** Jenis gambar sebenarnya dari byte awal berkas (magic bytes); null bila bukan format yang diizinkan. */
export function detectImageMime(bytes: ArrayLike<number> | null | undefined): string | null {
  if (!bytes || bytes.length < 12) return null;
  const b = (i: number) => bytes[i];
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return "image/jpeg";
  if (
    b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47 &&
    b(4) === 0x0d && b(5) === 0x0a && b(6) === 0x1a && b(7) === 0x0a
  ) return "image/png";
  if (b(0) === 0x47 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x38 && (b(4) === 0x37 || b(4) === 0x39) && b(5) === 0x61) {
    return "image/gif";
  }
  if (
    b(0) === 0x52 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x46 &&
    b(8) === 0x57 && b(9) === 0x45 && b(10) === 0x42 && b(11) === 0x50
  ) return "image/webp";
  return null;
}
