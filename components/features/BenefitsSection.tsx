import { Check, X } from "lucide-react";
import React from "react";
import Link from "next/link";
import { RegistrationModal } from "./RegistrationModal";

const withoutKlandesa = [
  "Laporan SDGs dan RPJM tidak terhubung langsung dari data administrasi aktual.",
  "APBDes dan program lapangan (PKK, BUMDes) berjalan di spreadsheet terpisah.",
  "Pemda kesulitan memverifikasi data tanpa struktur akses konsisten lintas operator desa.",
  "Unduh laporan ke format Kemendesa harus disalin manual berulang.",
  "Peta pembangunan & risiko wilayah tidak sama dengan skor pembangunan masyarakat.",
];

const withKlandesa = [
  "Skor 18 sasaran dibentuk langsung oleh data penduduk + program + APBDes Anda.",
  "RPJMDes, kegiatan, dan usulan warga menggunakan konteks sasaran pembangunan yang sama.",
  "Hak akses jelas untuk admin, Kades, Sekdes, staf—plus tampilan khusus pemda untuk banyak desa.",
  "Unduhan format standar Kemendesa disertai catatan riwayat untuk audit pemdes/pemkab.",
  "Peta capaian per RT/RW dan modul wilayah menghubungkan indikator dengan geografi desa.",
];

export function BenefitsSection() {
  const [showRegistration, setShowRegistration] = React.useState(false);

  return (
    <section
      id="manfaat"
      className="relative py-20 md:py-32 bg-gradient-to-b from-white via-[#f0f4ff] to-white overflow-hidden"
    >
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#6366f1] rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
        <div className="absolute top-40 right-10 w-72 h-72 bg-[#0d9488] rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-[#0d9488]/20 mb-4">
            <span className="text-sm text-[#0d9488]">Manfaat nyata</span>
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl text-gray-900 mb-4 leading-tight">
            Mengapa memilih{" "}
            <span className="bg-gradient-to-r from-[#0d9488] to-[#6366f1] bg-clip-text text-transparent">
              Klandesa?
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Fondasi klasik digital desa kini perlu menghubungkan data, perencanaan, dan sasaran pembangunan.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 relative">
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <div className="bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] text-white px-6 py-3 rounded-full shadow-2xl border-4 border-white">
              <span className="text-xl">VS</span>
            </div>
          </div>

          <div className="group relative bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
            <div className="absolute top-0 left-0 w-24 h-24 bg-red-500/5 rounded-br-full" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-gradient-to-br from-red-100 to-red-200 p-4 rounded-2xl shadow-md group-hover:scale-110 transition-transform duration-300">
                  <X className="w-7 h-7 text-red-600" />
                </div>
                <div>
                  <h3 className="text-2xl text-gray-900">Tanpa rantai tunggal data</h3>
                  <p className="text-sm text-gray-500">Aplikasi &amp; file terpisah</p>
                </div>
              </div>

              <ul className="space-y-4">
                {withoutKlandesa.map((item, index) => (
                  <li key={index} className="flex gap-3">
                    <div className="bg-red-100 p-1 rounded-lg h-fit">
                      <X className="w-4 h-4 text-red-600 flex-shrink-0" />
                    </div>
                    <span className="text-gray-700 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-[#0d9488] via-[#0f766e] to-[#0d9488] rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />

            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl shadow-md border border-white/30">
                  <Check className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl text-white">Dengan Klandesa</h3>
                  <p className="text-sm text-white/80">Operasional + SDGs dalam satu aplikasi</p>
                </div>
              </div>

              <ul className="space-y-4">
                {withKlandesa.map((item, index) => (
                  <li key={index} className="flex gap-3">
                    <div className="bg-[#fbbf24] p-1 rounded-lg h-fit shadow-md">
                      <Check className="w-4 h-4 text-gray-900 flex-shrink-0" />
                    </div>
                    <span className="text-white leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 pt-6 border-t border-white/20 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-white/80">
                  Cocok bagi desa &amp; Pemda bersama struktur akses sama
                </span>
                <span className="text-xs px-3 py-1 rounded-full bg-white/15 border border-white/30 text-[#fef3c7] font-medium uppercase tracking-wide">
                  Direkomendasikan
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-12 space-y-3">
          <p className="text-gray-600">Ingin tahu fitur mana yang cocok untuk desa Anda?</p>
          <button
            type="button"
            className="cursor-pointer bg-gradient-to-r from-[#0d9488] to-[#0f766e] text-white px-8 py-4 rounded-xl hover:shadow-xl transition-all hover:scale-105 shadow-lg"
            onClick={() => setShowRegistration(true)}
          >
            Mulai diskusi dengan tim kami
          </button>
          <div>
            <Link href="/demo" className="text-[#0d9488] text-sm font-medium hover:underline mx-4">
              Coba akun demo
            </Link>
          </div>
        </div>
      </div>

      {showRegistration && (
        <RegistrationModal onClose={() => setShowRegistration(false)} />
      )}
    </section>
  );
}
