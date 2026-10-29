import { DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { getSpacesClient, getSpacesConfig } from "@/lib/spaces";
import { releaseMobileMedia } from "./media-usage";

/**
 * Hapus objek foto unggahan mobile dari Spaces (best-effort, tidak melempar).
 * Hanya URL di folder `villages/<kode desa>/<folder>/` milik desa itu yang dihapus; URL lain diabaikan.
 * Ukuran tiap objek dibaca (HeadObject) sebelum dihapus, lalu dikurangkan dari penghitung kuota foto desa.
 */
export async function deleteMobilePhotos(urls: string[], villageCode: string, folders: string[] = ["mobile-social", "mobile-reports"]): Promise<number> {
  try {
    const cfg = getSpacesConfig();
    const base = cfg.cdnBaseUrl.replace(/\/+$/, "") + "/";
    const client = getSpacesClient();
    let n = 0;
    let freed = 0;
    for (const url of urls.slice(0, 200)) {
      if (typeof url !== "string" || !url.startsWith(base)) continue;
      const key = url.slice(base.length);
      if (key.includes("..") || !folders.some((f) => key.startsWith(`villages/${villageCode}/${f}/`))) continue;
      // Bila ukuran tidak terbaca, penghitung tidak dikurangi (condong ke arah aman); rekonsiliasi akan memperbaikinya.
      const size = await client.send(new HeadObjectCommand({ Bucket: cfg.bucket, Key: key })).then((h) => h.ContentLength ?? 0).catch(() => 0);
      await client.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key })).then(() => { n += 1; freed += size; }).catch(() => undefined);
    }
    if (freed > 0) {
      const v = await prisma.village.findUnique({ where: { code: villageCode }, select: { id: true } });
      if (v) await releaseMobileMedia(v.id, freed);
    }
    return n;
  } catch (e) {
    console.error("deleteMobilePhotos failed:", e);
    return 0;
  }
}
