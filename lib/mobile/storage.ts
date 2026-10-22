import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSpacesClient, getSpacesConfig } from "@/lib/spaces";

/**
 * Hapus objek foto unggahan mobile dari Spaces (best-effort, tidak melempar).
 * Hanya URL di folder `villages/<kode desa>/<folder>/` milik desa itu yang dihapus; URL lain diabaikan.
 */
export async function deleteMobilePhotos(urls: string[], villageCode: string, folders: string[] = ["mobile-social", "mobile-reports"]): Promise<number> {
  try {
    const cfg = getSpacesConfig();
    const base = cfg.cdnBaseUrl.replace(/\/+$/, "") + "/";
    const client = getSpacesClient();
    let n = 0;
    for (const url of urls.slice(0, 200)) {
      if (typeof url !== "string" || !url.startsWith(base)) continue;
      const key = url.slice(base.length);
      if (key.includes("..") || !folders.some((f) => key.startsWith(`villages/${villageCode}/${f}/`))) continue;
      await client.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key })).then(() => { n += 1; }).catch(() => undefined);
    }
    return n;
  } catch (e) {
    console.error("deleteMobilePhotos failed:", e);
    return 0;
  }
}
