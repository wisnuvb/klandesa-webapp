import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { getSpacesClient, getSpacesConfig } from "@/lib/spaces";
import { blogKeyFromUrl, removedBlogImageUrls } from "./image-upload";

/** Batas kandidat hapus per simpan (cover + gambar yang dibuang dari isi). */
const MAX_CANDIDATES = 50;

/**
 * URL gambar blog kita yang ada di isi lama tetapi sudah tidak ada di isi baru. [] bila Spaces belum
 * dikonfigurasi (tanpa CDN kita tidak ada gambar yang bisa dikenali).
 */
export function removedInlineImageUrls(beforeContent: string | null, afterContent: string | null): string[] {
  try {
    return removedBlogImageUrls(beforeContent, afterContent, getSpacesConfig().cdnBaseUrl);
  } catch {
    return [];
  }
}

/**
 * Hapus gambar blog lama dari Spaces setelah cover diganti/dihapus atau gambar dibuang dari isi artikel. BEST-EFFORT: tidak pernah melempar.
 * Aturan keselamatan: hanya kunci `blog/YYYY/MM/<uuid>.ext` di bawah CDN kita; dilewati bila URL itu masih
 * dipakai (cover/isi artikel ini setelah perubahan, atau cover/isi artikel lain); dilewati bila Spaces belum dikonfigurasi.
 * Mengembalikan kunci yang benar-benar dihapus.
 */
export async function deleteReplacedBlogImages(
  candidateUrls: string[],
  after: { postId: bigint; coverImageUrl: string | null; content: string | null },
): Promise<string[]> {
  const deleted: string[] = [];
  try {
    const cfg = getSpacesConfig(); // melempar bila env belum lengkap → lewati
    const client = getSpacesClient();
    for (const url of [...new Set(candidateUrls)].slice(0, MAX_CANDIDATES)) {
      const key = blogKeyFromUrl(url, cfg.cdnBaseUrl);
      if (!key) continue;
      if (after.coverImageUrl === url || (after.content ?? "").includes(url)) continue;
      const other = await prisma.blogPost.findFirst({
        where: { id: { not: after.postId }, OR: [{ coverImageUrl: url }, { content: { contains: url } }] },
        select: { id: true },
      });
      if (other) continue;
      try {
        await client.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }));
        deleted.push(key);
      } catch (e) {
        console.error("[blog-image] gagal menghapus objek lama:", e instanceof Error ? e.message : e);
      }
    }
  } catch {
    // Spaces tidak terkonfigurasi atau kueri gagal: abaikan.
  }
  return deleted;
}
