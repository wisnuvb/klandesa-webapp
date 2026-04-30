import type { Metadata } from "next";
import { getLandingPageMetadata } from "@/lib/seo/landing-pages";

export const metadata: Metadata = getLandingPageMetadata("fitur");

export default function FiturLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
