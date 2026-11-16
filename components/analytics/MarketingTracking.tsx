"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  consentServerSnapshot,
  consentSnapshot,
  subscribeConsent,
  subscribeConsentOpen,
  writeConsent,
} from "@/lib/marketing/consent";
import {
  META_PIXEL_ID,
  startMetaPixel,
  stopMetaPixel,
  trackMeta,
} from "@/lib/marketing/meta-pixel";

/**
 * Pemuat Meta Pixel + banner persetujuan untuk halaman pemasaran publik (bukan dasbor desa).
 * Tidak merender apa pun dan tidak memuat skrip bila NEXT_PUBLIC_META_PIXEL_ID kosong.
 */
export function MarketingTracking() {
  if (!META_PIXEL_ID) return null;
  return <Inner />;
}

function Inner() {
  const consent = useSyncExternalStore(subscribeConsent, consentSnapshot, consentServerSnapshot);
  const pathname = usePathname();
  const [reopened, setReopened] = useState(false);

  useEffect(() => subscribeConsentOpen(() => setReopened(true)), []);

  // Muat Pixel saat disetujui (persetujuan yang ditarik berlaku penuh pada pemuatan halaman berikutnya).
  useEffect(() => {
    if (consent === "granted") startMetaPixel();
    else if (consent === "denied") stopMetaPixel();
  }, [consent]);

  // PageView per halaman (termasuk navigasi sisi-klien). Auto-PageView bawaan Pixel tidak dipakai.
  // Hanya bergantung pada `pathname`: perubahan persetujuan tidak boleh menembakkan PageView kedua (antrean yang
  // ditahan sebelum persetujuan sudah dikirim oleh startMetaPixel, dan dibuang oleh stopMetaPixel bila ditolak).
  useEffect(() => {
    if (consentSnapshot() === "denied") return;
    trackMeta("PageView");
  }, [pathname]);

  const visible = consent === "unset" || reopened;
  if (!visible) return null;

  const choose = (choice: "granted" | "denied") => {
    writeConsent(choice);
    setReopened(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4"
    >
      <div className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl sm:p-5">
        <p id="cookie-consent-title" className="text-base font-semibold text-gray-900">
          Boleh kami ukur iklan dengan cookie?
        </p>
        <p className="mt-1 text-sm leading-relaxed text-gray-700">
          Kami memakai Meta Pixel untuk mengetahui iklan mana yang membawa pengunjung ke Klandesa. Nama dan nomor
          yang Anda isi di formulir tidak dikirim ke Meta. Pilihan Anda bisa diubah kapan saja lewat tautan
          &ldquo;Pengaturan cookie&rdquo; di bagian bawah halaman.{" "}
          <Link href="/cookie-policy" className="text-[#0f766e] underline underline-offset-2">
            Kebijakan Cookie
          </Link>
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => choose("denied")}
            className="min-h-12 cursor-pointer rounded-xl border border-gray-300 bg-white px-4 text-base font-medium text-gray-900 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0d9488]/40"
          >
            Tolak
          </button>
          <button
            type="button"
            onClick={() => choose("granted")}
            className="min-h-12 cursor-pointer rounded-xl bg-[#0f766e] px-4 text-base font-medium text-white transition hover:bg-[#115e59] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0d9488]/40"
          >
            Setuju
          </button>
        </div>
      </div>
    </div>
  );
}
