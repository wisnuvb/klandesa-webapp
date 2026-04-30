import { AppLayoutClient } from "./AppLayoutClient";
import type { Metadata } from "next";

/** Rute dashboard using auth + DB; don't make it static at build (without DB connection). */
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return <AppLayoutClient>{children}</AppLayoutClient>;
}
