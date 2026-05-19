import type { Metadata } from "next";
import { getLandingPageMetadata } from "@/lib/seo/landing-pages";

export const metadata: Metadata = getLandingPageMetadata("karir");

export default function KarirLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
