import type { Metadata } from "next";
import { getLandingPageMetadata } from "@/lib/seo/landing-pages";

export const metadata: Metadata = getLandingPageMetadata("blog");

/** Data blog dari DB — jangan prerender saat build (deploy lokal tanpa DATABASE_URL prod). */
export const dynamic = "force-dynamic";

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
