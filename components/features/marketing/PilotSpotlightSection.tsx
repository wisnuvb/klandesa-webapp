"use client";

/**
 * Narratif pilot mengganti social proof berangka besar—transparan bahwa beberapa modul
 * masih early access wilayah percontohan.
 */
export function PilotSpotlightSection() {
  return (
    <section className="py-14 md:py-16 bg-linear-to-br from-emerald-50/70 via-white to-indigo-50/60 border-y border-emerald-100/80">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#0d9488]">Studi wilayah</p>
        <h2 className="text-2xl md:text-3xl text-gray-900 leading-snug">
          Program desa percontohan &amp; early access modul baru
        </h2>
        <p className="text-gray-700 text-lg leading-relaxed">
          Alih-alih menyebut ribuan instalasi sekadar angka pajangan, Klandesa membangun jalur onboarding bersama satu
          desa atau klaster kecamatan pada satu waktu. Modul sensitif wilayah (SDGs penuh, integrasi dokumentasi pusat)
          mendapat badge <span className="font-semibold text-[#4338ca]">Early Access</span> sampai wilayah Anda mendapat
          jadwal go-live bersama pelatihan & success review.
        </p>
      </div>
    </section>
  );
}
