"use client";

import { EARLY_ACCESS_LABEL } from "@/lib/marketing/copy";

/**
 * Narratif pilot mengganti social proof berangka besar—transparan bahwa beberapa fitur
 * masih dibuka bertahap untuk desa percontohan.
 */
export function PilotSpotlightSection() {
  return (
    <section className="py-14 md:py-16 bg-linear-to-br from-emerald-50/70 via-white to-indigo-50/60 border-y border-emerald-100/80">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#0d9488]">Program percontohan</p>
        <h2 className="text-2xl md:text-3xl text-gray-900 leading-snug">
          Desa percontohan &amp; fitur akses awal
        </h2>
        <p className="text-gray-700 text-lg leading-relaxed">
          Kami membangun bersama satu desa atau beberapa desa dalam satu kecamatan pada satu waktu.
          Fitur seperti SDGs lengkap dan unduhan Kemendesa ditandai{" "}
          <span className="font-semibold text-[#4338ca]">{EARLY_ACCESS_LABEL}</span> sampai wilayah Anda
          siap dipasangkan pelatihan dan pendampingan resmi.
        </p>
      </div>
    </section>
  );
}
