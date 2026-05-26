"use client";

import Link from "next/link";

/**
 * Ilustrasi antarmuka produk (tanpa foto stok)—menyerupai alur nyata untuk SDGs,
 * ekspor integrasi, spasial wilayah, dan asisten AI. Bukan rekaman screenshot piksel,
 * tetapi mockup struktural yang menghindari klaim foto produksi.
 */
export function ProductShowcaseSection() {
  return (
    <section id="cuplikan-produk" className="py-20 md:py-28 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0d9488]">
            Cuplikan antarmuka
          </p>
          <h2 className="text-3xl md:text-4xl text-gray-900">
            Dari scoring SDGs sampai eksplor wilayah & AI
          </h2>
          <p className="text-lg text-gray-600">
            Visual berikut memadukan layout nyata aplikasi menjadi mockup struktural staging—agar tim Anda bisa
            membayangkan alir data tanpa ketergantungan pada foto stok generik.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
          <article className="rounded-3xl border border-gray-100 bg-linear-to-br from-slate-50 to-white shadow-lg overflow-hidden flex flex-col">
            <header className="flex items-center justify-between border-b border-gray-100 bg-gray-50/90 px-4 py-2.5">
              <span className="text-[11px] font-medium uppercase text-gray-500">Integrasi Kemendesa</span>
              <span className="text-[11px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full font-medium">
                CSV / JSON • log audit
              </span>
            </header>
            <div className="p-4 space-y-2 font-mono text-[11px] text-gray-600 flex-1">
              <div className="flex justify-between rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
                <span>penduduk_v4.csv</span>
                <span className="text-emerald-700">disiapkan ✓</span>
              </div>
              <div className="flex justify-between rounded-lg bg-white border px-3 py-2">
                <span>apbdes_map.json</span>
                <span className="text-gray-400">validasi struktur…</span>
              </div>
              <div className="rounded-lg bg-gray-900 text-gray-300 px-3 py-2 leading-relaxed">
                <span className="text-[#86efac]">audit ›</span> admin_desa menyetujui paket eksport —
                checksum tercatat
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-gray-100 bg-linear-to-br from-white to-teal-50/40 shadow-lg overflow-hidden flex flex-col">
            <header className="flex items-center justify-between border-b border-gray-100 bg-white/95 px-4 py-2.5">
              <span className="text-[11px] font-semibold text-gray-800">GIS & Lingkungan</span>
              <span className="text-[11px] text-[#4338ca]">heatmap RT/RW</span>
            </header>
            <div className="relative flex-1 min-h-[180px] p-4">
              <div className="absolute inset-4 rounded-2xl bg-linear-to-br from-slate-200 to-sky-100 border border-white shadow-inner flex items-center justify-center">
                <div className="grid grid-cols-4 gap-2 opacity-75">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-6 rounded-md ${
                        i % 5 === 0 ? "bg-rose-400/70" : i % 3 === 0 ? "bg-teal-500/55" : "bg-white/65"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="absolute bottom-7 left-7 right-7 flex justify-between text-[11px] text-gray-700">
                <span className="rounded-full bg-white/90 px-2 py-1 shadow-sm border">Titik bahaya ✶</span>
                <span className="rounded-full bg-white/90 px-2 py-1 shadow-sm border">Aset jalan ★</span>
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-gray-100 bg-linear-to-br from-indigo-50/60 to-white shadow-lg overflow-hidden flex flex-col">
            <header className="border-b border-gray-100 px-4 py-2 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-green-400" aria-hidden />
              <span className="text-[11px] font-medium text-gray-700">Asisten AI konteks desa</span>
            </header>
            <div className="p-4 space-y-3 flex-1 text-sm">
              <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-[#0f766e] text-white px-3 py-2 leading-snug shadow">
                Rangkuman capaian SDG 11 dari data infrastuktur minggu ini?
              </div>
              <div className="mr-auto max-w-[90%] rounded-2xl rounded-tl-sm bg-white border border-gray-100 px-3 py-2 text-gray-800 leading-snug shadow-sm">
                Tiga RW menunjuk indikator jalan baru; lampirkan foto geotagging untuk dokumentasi APBDes tagging
                9.c.
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-gray-100 bg-white shadow-lg overflow-hidden flex flex-col">
            <header className="border-b bg-gray-50 px-4 py-2 text-[11px] font-semibold text-gray-800">
              RPJMDes • prioritas terbobot sasaran SDG
            </header>
            <div className="p-4 space-y-3 flex-1">
              {[1, 2, 3].map((rank) => (
                <div
                  key={rank}
                  className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2.5 hover:border-[#0d9488]/30 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">Paket pembangunan {rank}</p>
                    <p className="text-xs text-gray-500">Bobot sasaran #{3 + rank} • usulan Musdes</p>
                  </div>
                  <span className="text-[11px] font-bold text-[#0d9488]">#{rank}</span>
                </div>
              ))}
            </div>
          </article>
        </div>

        <p className="mt-12 text-center text-sm text-gray-500 max-w-2xl mx-auto">
          Butuh foto layar tinggi atau studi lapangan wilayah tertentu? Tim produk dapat menyiapkannya bersama Anda
          setelah jadwal demo resmi.&nbsp;
          <Link href="/demo" className="text-[#0d9488] font-semibold underline-offset-4 hover:underline">
            Kunjungi halaman Demo
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
