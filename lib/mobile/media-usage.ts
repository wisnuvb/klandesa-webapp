import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSpacesClient } from "@/lib/spaces";
import { mobileMediaPrefix } from "./media-quota";

const CACHE_TTL_MS = 10 * 60_000;
/** Pengaman: 50 halaman x 1000 objek. Lebih dari itu pasti sudah melewati kuota. */
const MAX_LIST_PAGES = 50;

const cache = new Map<string, { bytes: number; at: number }>();

/**
 * Total byte foto seluler satu desa, dihitung dari isi bucket (biaya nyata, termasuk foto yang postingannya sudah dihapus
 * tetapi berkasnya masih tersimpan). Di-cache per proses selama 10 menit agar tidak membebani setiap unggahan.
 */
export async function getVillageMobileMediaBytes(villageCode: string, bucket: string): Promise<number> {
  const hit = cache.get(villageCode);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.bytes;

  const client = getSpacesClient();
  let total = 0;
  let token: string | undefined;
  for (let page = 0; page < MAX_LIST_PAGES; page++) {
    const out = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: mobileMediaPrefix(villageCode), ContinuationToken: token }),
    );
    for (const obj of out.Contents ?? []) total += obj.Size ?? 0;
    if (!out.IsTruncated || !out.NextContinuationToken) break;
    token = out.NextContinuationToken;
  }
  cache.set(villageCode, { bytes: total, at: Date.now() });
  return total;
}

/** Tambahkan unggahan yang baru diizinkan ke cache agar kuota tetap akurat di antara dua penghitungan ulang. */
export function noteMobileMediaUpload(villageCode: string, bytes: number): void {
  const hit = cache.get(villageCode);
  if (hit) hit.bytes += bytes;
}
