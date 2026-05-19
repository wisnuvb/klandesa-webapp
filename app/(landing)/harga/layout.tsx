import type { Metadata } from "next";
import { getLandingPageMetadata } from "@/lib/seo/landing-pages";

export const metadata: Metadata = getLandingPageMetadata("harga");

export default function HargaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
