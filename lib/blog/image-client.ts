/**
 * Perkecil gambar di peramban sebelum diunggah: foto kamera/ponsel sering 3–5 MB dan 4000+ px,
 * padahal artikel hanya menampilkannya selebar ±768 px. Ini menjaga halaman artikel ringan
 * dan unggahan di bawah batas 5 MB server. Mengikuti pola foto warga (lib/residents/photo-client.ts).
 */

/** Sisi terpanjang hasil (px). Cukup tajam untuk layar 2x pada kolom artikel dan gambar OG 1200 px. */
export const BLOG_IMAGE_MAX_SIDE = 1920;
/** Berkas di bawah ini dan dalam batas sisi dikirim apa adanya (tanpa encode ulang yang merusak kualitas). */
const KEEP_ORIGINAL_BELOW_BYTES = 600 * 1024;

/** Ukuran baru yang muat dalam `max` px di sisi terpanjang, tanpa memperbesar. */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= max) return { width, height };
  const k = max / longest;
  return { width: Math.max(1, Math.round(width * k)), height: Math.max(1, Math.round(height * k)) };
}

/** Perlu diproses ulang? Ya bila terlalu besar dimensinya atau ukurannya. */
export function needsDownscale(width: number, height: number, bytes: number): boolean {
  return Math.max(width, height) > BLOG_IMAGE_MAX_SIDE || bytes > KEEP_ORIGINAL_BELOW_BYTES;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Gambar tidak bisa dibaca. Pastikan berkas JPG, PNG, atau WebP yang utuh."));
    };
    img.src = url;
  });
}

/**
 * Kembalikan berkas yang sudah diperkecil (WebP, kualitas 0,85; transparansi PNG tetap terjaga).
 * Bila tidak perlu, atau hasilnya justru lebih besar, berkas asli dikembalikan.
 */
export async function prepareBlogImage(file: File): Promise<File> {
  const img = await loadImage(file);
  if (!needsDownscale(img.naturalWidth, img.naturalHeight, file.size)) return file;

  const { width, height } = fitWithin(img.naturalWidth, img.naturalHeight, BLOG_IMAGE_MAX_SIDE);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
  // Peramban lama tanpa encoder WebP mengembalikan PNG; abaikan bila tidak menolong.
  if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
}
