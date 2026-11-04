"use client";

import { usePathname } from "next/navigation";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";

/**
 * Google Analytics untuk grup rute (app). Halaman atur kata sandi memuat token rahasia di URL: GA mengirim URL
 * lengkap (beserta query) ke Google, jadi jangan dimuat di sana. Diputuskan di klien agar layout (app) bisa statis.
 */
export function AppGoogleAnalytics() {
  const pathname = usePathname() ?? "/";
  if (pathname.startsWith("/auth/atur-sandi")) return null;
  return <GoogleAnalytics />;
}
