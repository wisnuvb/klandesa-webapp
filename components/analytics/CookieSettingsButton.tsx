"use client";

import { openConsentSettings } from "@/lib/marketing/consent";
import { META_PIXEL_ID } from "@/lib/marketing/meta-pixel";

/** Tautan "Pengaturan cookie": membuka kembali banner persetujuan. Tidak tampil bila Meta Pixel tidak dipakai. */
export function CookieSettingsButton({ className }: { className?: string }) {
  if (!META_PIXEL_ID) return null;
  return (
    <button type="button" onClick={openConsentSettings} className={className}>
      Pengaturan cookie
    </button>
  );
}
