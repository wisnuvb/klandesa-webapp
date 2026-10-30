import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSpacesClient, getSpacesConfig } from "@/lib/spaces";
import { detectImageMime, normalizeMime } from "./media";

export type VerifiedImage = { ok: true; size: number; mime: string } | { ok: false; error: string };

/**
 * Upload langsung ke storage tidak melewati server, jadi data dari klien tidak bisa dipercaya.
 * Sebelum dicatat sebagai aset, periksa objek yang benar-benar ada: ukuran nyata, byte awal
 * (magic bytes) harus gambar yang diizinkan, dan Content-Type tersimpan harus sama dengan isinya.
 */
export async function verifyUploadedImage(key: string, maxBytes: number): Promise<VerifiedImage> {
  const s3 = getSpacesClient();
  const { bucket } = getSpacesConfig();

  const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key })).catch(() => null);
  if (!head) return { ok: false, error: "Berkas belum terunggah. Coba unggah ulang." };

  const size = head.ContentLength ?? 0;
  if (size <= 0) return { ok: false, error: "Berkas kosong." };
  if (size > maxBytes) return { ok: false, error: "Ukuran gambar melebihi batas." };

  const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key, Range: "bytes=0-15" })).catch(() => null);
  const bytes = obj?.Body ? await obj.Body.transformToByteArray().catch(() => null) : null;
  const mime = detectImageMime(bytes);
  if (!mime) return { ok: false, error: "Isi berkas bukan gambar JPG, PNG, WebP, atau GIF." };
  if (normalizeMime(head.ContentType) !== mime) {
    return { ok: false, error: "Jenis berkas tidak sesuai dengan isinya." };
  }
  return { ok: true, size, mime };
}

/** Hapus objek tanpa melempar galat (pembersihan setelah verifikasi gagal). */
export async function deleteStorageObjectQuietly(key: string): Promise<void> {
  try {
    const { bucket } = getSpacesConfig();
    await getSpacesClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (e) {
    console.error("deleteStorageObjectQuietly failed:", e);
  }
}
