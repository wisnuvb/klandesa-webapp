import type { Metadata } from "next";
import { getLandingPageMetadata } from "@/lib/seo/landing-pages";

export const metadata: Metadata = getLandingPageMetadata("cek-bantuan-program");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
