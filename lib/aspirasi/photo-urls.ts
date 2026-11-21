import { buildSpacesPublicUrl } from "@/lib/spaces";

/** URL publik foto aspirasi dari kuncinya. Bila penyimpanan belum dikonfigurasi, foto dilewati (halaman tetap tampil). */
export function photoUrls(keys: string[]): string[] {
  const out: string[] = [];
  for (const k of keys) {
    try {
      out.push(buildSpacesPublicUrl(k));
    } catch {
      // Spaces belum dikonfigurasi
    }
  }
  return out;
}
