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
            Ilustrasi antarmuka
          </p>
          <h2 className="text-3xl md:text-4xl text-gray-900">
            Gambaran tampilan aplikasi
          </h2>
          <p className="text-lg text-gray-600">
            Ilustrasi (bukan tangkapan layar asli) temuan kepatuhan Dana Desa, peta wilayah, asisten AI,
            dan tenggat RKP Desa—supaya Anda bisa membayangkan alur kerjanya.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
          <article className="rounded-3xl border border-gray-100 bg-linear-to-br from-slate-50 to-white shadow-lg overflow-hidden flex flex-col">
            <header className="flex items-center justify-between border-b border-gray-100 bg-gray-50/90 px-4 py-2.5">
              <span className="text-[11px] font-medium uppercase text-gray-600">Dana Desa • temuan kepatuhan</span>
              <span className="text-[11px] text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full font-medium">
                dasar pasal tercantum
              </span>
            </header>
            <ul className="p-4 space-y-2 text-[12px] text-gray-700 flex-1">
              <li className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
                <span className="font-semibold text-rose-800">Perlu diperbaiki</span>
                <span className="block">Kegiatan terindikasi larangan belum diberi pengecualian beralasan</span>
              </li>
              <li className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <span className="font-semibold text-amber-900">Diperiksa</span>
                <span className="block">Laporan penetapan fokus belum dicatat tanggalnya</span>
              </li>
              <li className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                <span className="font-semibold text-gray-700">Catatan</span>
                <span className="block">Bukti publikasi baru ada untuk sebagian kanal</span>
              </li>
            </ul>
          </article>

          <article className="rounded-3xl border border-gray-100 bg-linear-to-br from-white to-teal-50/40 shadow-lg overflow-hidden flex flex-col">
            <header className="flex items-center justify-between border-b border-gray-100 bg-white/95 px-4 py-2.5">
              <span className="text-[11px] font-semibold text-gray-800">Peta & lingkungan</span>
              <span className="text-[11px] text-[#4338ca]">peta capaian RT/RW</span>
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
              <span className="text-[11px] font-medium text-gray-700">Laras • asisten AI baca-saja</span>
            </header>
            <div className="p-4 space-y-3 flex-1 text-sm">
              <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-[#0f766e] text-white px-3 py-2 leading-snug shadow">
                Ringkas permohonan surat yang masih menunggu minggu ini
              </div>
              <div className="mr-auto max-w-[90%] rounded-2xl rounded-tl-sm bg-white border border-gray-100 px-3 py-2 text-gray-800 leading-snug shadow-sm">
                Saya membaca ringkasan permohonan surat desa Anda (baca-saja), lalu menyebut jenis surat yang paling banyak
                menunggu dan yang sudah lewat 48 jam.
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-gray-100 bg-white shadow-lg overflow-hidden flex flex-col">
            <header className="border-b bg-gray-50 px-4 py-2 text-[11px] font-semibold text-gray-800">
              RKP Desa • tenggat dihitung otomatis
            </header>
            <ul className="p-4 space-y-2 flex-1">
              {[
                ["Musyawarah Desa perencanaan", "30 Juni", "selesai", "bg-emerald-100 text-emerald-900"],
                ["Informasi pagu indikatif", "31 Juli", "selesai", "bg-emerald-100 text-emerald-900"],
                ["Perdes RKP Desa ditetapkan", "30 September", "segera", "bg-amber-100 text-amber-900"],
                ["Daftar usulan ke kabupaten", "31 Desember", "akan datang", "bg-gray-100 text-gray-700"],
              ].map(([name, date, status, tone]) => (
                <li
                  key={name}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{name}</p>
                    <p className="text-xs text-gray-500">{date}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
                    {status}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        </div>

        <p className="mt-12 text-center text-sm text-gray-500 max-w-2xl mx-auto">
          Ingin melihat aplikasi yang sebenarnya?&nbsp;
          <Link href="/demo" className="text-[#0d9488] font-semibold underline-offset-4 hover:underline">
            Coba akun demo
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
