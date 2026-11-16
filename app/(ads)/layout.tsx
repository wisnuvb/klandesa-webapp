import Image from "next/image";
import Link from "next/link";
import { AppDialogProvider } from "@/components/providers/AppDialogProvider";
import { GoogleAdsTag } from "@/components/GoogleAdsTag";
import { MarketingTracking } from "@/components/analytics/MarketingTracking";
import { CookieSettingsButton } from "@/components/analytics/CookieSettingsButton";

/**
 * Layout halaman tujuan iklan: tanpa navigasi situs (satu tujuan per halaman), hanya logo, isi, dan footer legal.
 * Tag Google tetap dipasang seperti di halaman pemasaran lain; Meta Pixel + banner persetujuan lewat MarketingTracking.
 */
export default function AdsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppDialogProvider>
      <GoogleAdsTag />
      <MarketingTracking />
      <div className="flex min-h-dvh flex-col bg-white text-gray-900">
        <header className="border-b border-gray-100 bg-white">
          <div className="mx-auto flex h-16 max-w-5xl items-center px-4 sm:px-6">
            <Image
              src="/brand/klandesa-logo.svg"
              alt="Klandesa"
              width={844}
              height={160}
              priority
              className="h-8 w-auto"
            />
          </div>
        </header>
        <div className="flex-1">{children}</div>
        <footer className="border-t border-gray-100 bg-gray-50 pb-24 lg:pb-0">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-6 text-sm text-gray-700 sm:px-6">
            <p>© {new Date().getFullYear()} Klandesa</p>
            <nav aria-label="Informasi legal" className="flex flex-wrap items-center gap-x-5 gap-y-1">
              <Link href="/privacy-policy" className="inline-flex min-h-11 items-center underline-offset-2 hover:underline">
                Kebijakan Privasi
              </Link>
              <Link href="/cookie-policy" className="inline-flex min-h-11 items-center underline-offset-2 hover:underline">
                Kebijakan Cookie
              </Link>
              <CookieSettingsButton className="inline-flex min-h-11 cursor-pointer items-center underline-offset-2 hover:underline" />
            </nav>
          </div>
        </footer>
      </div>
    </AppDialogProvider>
  );
}
