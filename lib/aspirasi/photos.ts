/**
 * Foto aspirasi dari publik. Aturan privasi: hanya WebP tanpa metadata. Peramban mengubah foto lewat kanvas (membuang EXIF/GPS)
 * sebelum mengunggah; server TIDAK percaya itu, jadi memeriksa potongan RIFF dan menolak EXIF/XMP/ICCP serta WebP beranimasi.
 * Foto baru tayang setelah moderator meninjau (wajah dan plat nomor dicek manual).
 */
export const ASPIRATION_PHOTO_MAX_BYTES = 1_500_000;
/** Batas byte nyata untuk body multipart: berkas maksimal + overhead boundary/field. */
export const ASPIRATION_PHOTO_BODY_LIMIT = ASPIRATION_PHOTO_MAX_BYTES + 32 * 1024;

const FORBIDDEN_CHUNKS = new Set(["EXIF", "XMP ", "ICCP", "ANIM", "ANMF"]);
const IMAGE_CHUNKS = new Set(["VP8 ", "VP8L", "VP8X", "ALPH"]);

export type WebpCheck = { ok: true } | { ok: false; reason: string };

const fourcc = (b: Uint8Array, o: number) => String.fromCharCode(b[o]!, b[o + 1]!, b[o + 2]!, b[o + 3]!);

export function inspectWebp(bytes: Uint8Array): WebpCheck {
  if (bytes.length < 20 || fourcc(bytes, 0) !== "RIFF" || fourcc(bytes, 8) !== "WEBP") return { ok: false, reason: "Berkas bukan WebP." };
  const riffSize = bytes[4]! | (bytes[5]! << 8) | (bytes[6]! << 16) | (bytes[7]! * 0x1000000);
  // Ukuran RIFF harus pas dengan berkas (boleh 1 byte pengisi): tidak ada muatan lain yang ditempel di belakang gambar.
  if (riffSize + 8 !== bytes.length && riffSize + 9 !== bytes.length) return { ok: false, reason: "Berkas WebP rusak." };
  let off = 12;
  let sawImage = false;
  while (off + 8 <= bytes.length) {
    const id = fourcc(bytes, off);
    const size = bytes[off + 4]! | (bytes[off + 5]! << 8) | (bytes[off + 6]! << 16) | (bytes[off + 7]! * 0x1000000);
    if (FORBIDDEN_CHUNKS.has(id)) {
      return { ok: false, reason: id === "ANIM" || id === "ANMF" ? "Gambar beranimasi tidak diterima." : "Foto masih memuat metadata (lokasi/kamera). Unggah lewat formulir agar dibersihkan otomatis." };
    }
    if (IMAGE_CHUNKS.has(id) && id !== "VP8X") sawImage = true;
    off += 8 + size + (size % 2);
  }
  return sawImage ? { ok: true } : { ok: false, reason: "Berkas WebP tidak berisi gambar." };
}

/** Kunci objek: aspirasi/<tahun>/<bulan>/<uuid>.webp (nama berkas klien tidak pernah dipakai). */
export function aspirationPhotoKey(uuid: string, now: Date = new Date()): string {
  return `aspirasi/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${uuid}.webp`;
}
