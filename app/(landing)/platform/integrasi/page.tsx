import Link from "next/link";
import type { Metadata } from "next";
import { getLandingPageMetadata } from "@/lib/seo/landing-pages";
import {
  BUILDING_NOTE,
  KEMENDESA_HUB_NOTE,
  listIntegrationAdapters,
} from "@/components/features/marketing/integration-copy";

export const metadata: Metadata = getLandingPageMetadata("platformIntegrasi");

export default function PlatformIntegrasiPage() {
  const adapters = listIntegrationAdapters();
  return (
    <article className="max-w-3xl mx-auto px-4 py-20 md:py-28">
      <p className="text-sm font-medium text-[#0d9488] mb-2">Laporan ke Kemendesa</p>
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
        Unduhan format standar
      </h1>
      <p className="text-gray-600 mb-4">{BUILDING_NOTE}</p>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 mb-8">
        {KEMENDESA_HUB_NOTE}
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Jenis unduhan yang tersedia</h2>
      <ul className="space-y-3 mb-10">
        {adapters.map((a) => (
          <li
            key={a.id}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
          >
            <div className="font-medium text-gray-900">{a.label}</div>
            <p className="text-sm text-gray-600 mt-1">{a.description}</p>
          </li>
        ))}
      </ul>
      <p className="text-sm text-gray-500 mb-8">
        Butuh penjelasan lebih rinci atau akses resmi Kemendesa sudah tersedia di wilayah Anda?
        Hubungi tim kami untuk panduan langkah demi langkah.
      </p>
      <Link
        href="/platform"
        className="text-[#0d9488] font-medium hover:underline"
      >
        ← Semua fitur aplikasi
      </Link>
    </article>
  );
}
