import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSpacesClient, getSpacesConfig } from "@/lib/spaces";
import { ASPIRATION_PHOTO_KEY_RE } from "./service";

/**
 * Hapus foto aspirasi dari Spaces (takedown, foto dibuang moderator). BEST-EFFORT: tidak pernah melempar; dilewati bila
 * Spaces belum dikonfigurasi. Hanya kunci berpola aspirasi/YYYY/MM/<uuid>.webp yang pernah dihapus.
 * Catatan: CDN dapat masih menyimpan salinan sampai cache-nya kedaluwarsa atau di-purge.
 */
export async function deleteAspirationPhotos(keys: string[]): Promise<string[]> {
  const deleted: string[] = [];
  try {
    const cfg = getSpacesConfig();
    const client = getSpacesClient();
    for (const key of [...new Set(keys)].slice(0, 20)) {
      if (!ASPIRATION_PHOTO_KEY_RE.test(key)) continue;
      try {
        await client.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }));
        deleted.push(key);
      } catch (e) {
        console.error("[aspirasi-photo] gagal menghapus objek:", e instanceof Error ? e.message : e);
      }
    }
  } catch {
    // Spaces belum dikonfigurasi
  }
  return deleted;
}
