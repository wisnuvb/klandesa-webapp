import type { Metadata } from "next";

import { getLandingPageMetadata } from "@/lib/seo/landing-pages";

export const metadata: Metadata = getLandingPageMetadata("tim");

export default function TimLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
