import type { Metadata } from "next";
import { getLandingPageMetadata } from "@/lib/seo/landing-pages";

export const metadata: Metadata = getLandingPageMetadata("mitra-klandesa");

export default function MitraKlandesaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
