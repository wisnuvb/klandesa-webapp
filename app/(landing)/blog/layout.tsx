import type { Metadata } from "next";
import { blogAlternates } from "@/lib/blog/alternates";
import { getLandingPageMetadata } from "@/lib/seo/landing-pages";

export const metadata: Metadata = {
  ...getLandingPageMetadata("blog"),
  // Canonical /blog + tautan RSS; halaman anak yang mengganti `alternates` memakai blogAlternates juga.
  alternates: blogAlternates("/blog"),
};

/**
 * Halaman blog tetap dirender dinamis: deploy lokal tanpa DATABASE_URL prod tidak boleh memprerender daftar
 * kosong ke dalam build. Beban database dijaga oleh unstable_cache di lib/blog/public-posts.ts
 * (tag "blog", 5 menit, di-invalidate admin lewat invalidateBlogCache).
 */
export const dynamic = "force-dynamic";

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
