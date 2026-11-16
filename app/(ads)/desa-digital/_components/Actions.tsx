"use client";

import * as React from "react";
import { MessageCircle } from "lucide-react";
import { RegistrationModal } from "@/components/features/RegistrationModal";
import { trackMeta } from "@/lib/marketing/meta-pixel";
import {
  captureReferralFromUrl,
  getStoredReferralCode,
  trackReferralClient,
} from "@/lib/referrals/client";
import { ADS_FORM_ID, ADS_WA_NUMBER, adsWhatsAppHref } from "@/lib/marketing/ads-landing";

/** ViewContent sekali saat halaman dibuka (sinyal "melihat penawaran" untuk optimasi iklan). */
export function ViewContentTracker() {
  React.useEffect(() => {
    captureReferralFromUrl(); // ?ref=KODE dari tautan mitra tetap tersimpan, seperti halaman pemasaran lain
    trackMeta("ViewContent", { content_name: "desa-digital", content_category: "landing-iklan" });
  }, []);
  return null;
}

/** Tautan WhatsApp: mencatat `Contact` ke Meta dan klik ke statistik referral internal. */
export function WhatsAppLink({
  location,
  className,
  children,
}: {
  location: "hero" | "formulir" | "bilah";
  className: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={adsWhatsAppHref()}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => {
        trackMeta("Contact", { content_name: `whatsapp-${location}` });
        void trackReferralClient("whatsapp_click", {
          refCode: getStoredReferralCode(),
          phone: ADS_WA_NUMBER,
          subject: "hubungi_cs_whatsapp",
          sourcePath: `${window.location.pathname}${window.location.search}`,
          metadata: { destination: "cs_whatsapp", channel: `iklan_meta_${location}`, waTarget: ADS_WA_NUMBER },
        });
      }}
    >
      <MessageCircle className="h-5 w-5" aria-hidden="true" />
      {children}
    </a>
  );
}

/** Tombol "Coba gratis": membuka modal pendaftaran trial yang sama dengan halaman /harga. */
export function TrialButton({ className, children }: { className: string; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => {
          void trackReferralClient("register_open");
          setOpen(true);
        }}
      >
        {children}
      </button>
      {open ? <RegistrationModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}

/** Bilah aksi lengket untuk ponsel (disembunyikan di layar lebar). */
export function StickyBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 p-3 backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-2 gap-3">
        <WhatsAppLink
          location="bilah"
          className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-[#0f766e] bg-white px-3 text-base font-semibold text-[#0f766e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0d9488]/40"
        >
          WhatsApp
        </WhatsAppLink>
        <a
          href={`#${ADS_FORM_ID}`}
          className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-xl bg-[#0f766e] px-3 text-base font-semibold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0d9488]/40"
        >
          Minta dihubungi
        </a>
      </div>
    </div>
  );
}
