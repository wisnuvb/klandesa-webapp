import { permanentRedirect } from "next/navigation";

/**
 * Rute statis `/blog/topik` sengaja ada: mencegahnya jatuh ke `[slug]` (yang akan mencari artikel
 * ber-slug "topik"). Tanpa slug topik, arahkan ke indeks blog.
 */
export default function BlogTopicRootPage() {
  permanentRedirect("/blog");
}
