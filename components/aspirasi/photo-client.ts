/**
 * Pengecil foto di peramban: gambar digambar ulang ke kanvas lalu disandikan ke WebP. Menggambar ulang membuang seluruh metadata
 * (EXIF/GPS/kamera). Server tetap memeriksa ulang isinya, jadi ini lapisan pertama, bukan satu-satunya.
 */
export const PHOTO_MAX_SIDE = 1600;
export const PHOTO_MAX_BYTES = 1_400_000;

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; release: () => void }> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { source: bmp, width: bmp.width, height: bmp.height, release: () => bmp.close() };
  } catch {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) };
  }
}

const toBlob = (canvas: HTMLCanvasElement, quality: number) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));

export async function shrinkToWebp(file: File, maxSide = PHOTO_MAX_SIDE, maxBytes = PHOTO_MAX_BYTES): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Berkas harus berupa gambar (JPG, PNG, atau WebP).");
  const { source, width, height, release } = await decode(file);
  try {
    let scale = Math.min(1, maxSide / Math.max(width, height));
    for (let round = 0; round < 4; round++) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Peramban tidak dapat memproses gambar.");
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
      for (const q of [0.8, 0.7, 0.6, 0.5]) {
        const blob = await toBlob(canvas, q);
        if (!blob || blob.type !== "image/webp") throw new Error("Peramban Anda belum mendukung pengecilan foto ke WebP. Coba peramban lain.");
        if (blob.size <= maxBytes) return blob;
      }
      scale *= 0.8;
    }
    throw new Error("Foto terlalu besar bahkan setelah dikecilkan. Pilih foto lain.");
  } finally {
    release();
  }
}
