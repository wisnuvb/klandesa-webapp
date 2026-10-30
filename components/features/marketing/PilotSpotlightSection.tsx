"use client";

import { EARLY_ACCESS_LABEL } from "@/lib/marketing/copy";

/**
 * Narasi jujur pengganti social proof berangka besar: beberapa fitur masih berlabel akses awal
 * (sudah termasuk Paket Lengkap, masih disempurnakan bersama desa pengguna).
 */
export function PilotSpotlightSection() {
  return (
    <section className="py-14 md:py-16 bg-linear-to-br from-emerald-50/70 via-white to-indigo-50/60 border-y border-emerald-100/80">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#0d9488]">Dikembangkan bersama desa</p>
        <h2 className="text-2xl md:text-3xl text-gray-900 leading-snug">
          Fitur akses awal sudah termasuk paket
        </h2>
        <p className="text-gray-700 text-lg leading-relaxed">
          Klandesa dikembangkan bersama desa pengguna. Fitur seperti SDGs lengkap dan unduhan Kemendesa
          ditandai <span className="font-semibold text-[#4338ca]">{EARLY_ACCESS_LABEL}</span>: sudah bisa
          dipakai dan termasuk Paket Lengkap, tetapi masih disempurnakan dari masukan desa.
        </p>
      </div>
    </section>
  );
}
