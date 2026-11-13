import { revalidateTag } from "next/cache";

/** Tag cache untuk semua kueri publik blog (daftar, detail, terkait, topik, feed). */
export const BLOG_CACHE_TAG = "blog";
/** Batas kedaluwarsa cache blog publik (detik): selisih paling lama bila invalidasi terlewat. */
export const BLOG_CACHE_SECONDS = 300;

/**
 * Hapus cache publik blog SEKARANG (kedaluwarsa langsung, `{ expire: 0 }`). Panggil dari rute admin
 * setelah simpan/terbit/tarik artikel supaya perubahan tampil tanpa menunggu 5 menit.
 *
 * Aturan Next 16: tidak boleh dipanggil saat render atau di dalam fungsi ber-cache; boleh dari route handler
 * dan server action. Gagal meng-invalidate tidak boleh menggagalkan penyimpanan, jadi galat hanya dicatat
 * (cache tetap kedaluwarsa sendiri dalam BLOG_CACHE_SECONDS).
 */
export function invalidateBlogCache(): void {
  try {
    revalidateTag(BLOG_CACHE_TAG, { expire: 0 });
  } catch (e) {
    console.error("[blog] invalidateBlogCache gagal:", e);
  }
}
