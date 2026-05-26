import { ArrowRight } from "lucide-react";
import React from "react";
import Link from "next/link";

interface CTASectionProps {
  onRegisterClick: () => void;
  onContactClick: () => void;
}

export function CTASection({
  onRegisterClick,
  onContactClick,
}: CTASectionProps) {
  return (
    <section
      id="kontak"
      className="relative py-20 md:py-32 bg-gradient-to-br from-[#0d9488] via-[#0f766e] to-[#0d9488] overflow-hidden"
    >
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-blob" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-white/30 mb-6">
          <span className="text-sm text-white">Klandesa bersama Pemdes &amp; Pemda</span>
        </div>

        <h2 className="text-4xl md:text-5xl lg:text-6xl text-white mb-6 leading-tight">
          Mau transformasi pembangunan desa Anda?
        </h2>

        <p className="text-xl md:text-2xl text-white/90 mb-12 max-w-3xl mx-auto leading-relaxed">
          Ikuti program desa percontohan untuk fitur SDGs, unduhan Kemendesa, dan peta
          pembangunan—kami jelaskan dengan jujur mana yang sudah siap pakai dan mana yang masih uji coba.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pb-12">
          <button
            type="button"
            onClick={onRegisterClick}
            className="group relative bg-white text-[#0d9488] px-8 py-4 rounded-xl hover:shadow-2xl transition-all hover:scale-105 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Daftar / Gabung Pilot</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            type="button"
            onClick={onContactClick}
            className="relative bg-transparent border-2 border-white text-white px-8 py-4 rounded-xl hover:bg-white/10 transition-all backdrop-blur-sm hover:scale-105 hover:border-[#fbbf24] hover:text-[#fbbf24] cursor-pointer"
          >
            Hubungi tim kami
          </button>

          <Link
            href="/demo"
            className="relative border border-white/40 text-white px-8 py-4 rounded-xl hover:bg-white/10 backdrop-blur-sm flex items-center justify-center"
          >
            Lihat demo aplikasi
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
          <div className="bg-white/12 backdrop-blur-sm rounded-xl p-5 border border-white/20">
            <div className="text-lg font-semibold text-white mb-1">Sesuatu sedang Anda cari tidak ada?</div>
            <p className="text-sm text-white/80">
              Butuh koneksi ke sistem daerah? Kami diskusikan bersama setelah kebutuhan desa Anda jelas.
            </p>
          </div>
          <div className="bg-white/12 backdrop-blur-sm rounded-xl p-5 border border-white/20">
            <div className="text-lg font-semibold text-white mb-1">Butuh materi untuk pemda?</div>
            <p className="text-sm text-white/80">
              Kami sediakan ringkasan fitur dan skenario lintas desa untuk penyusunan rencana pengadaan wilayah Anda.
            </p>
          </div>
          <div className="bg-white/12 backdrop-blur-sm rounded-xl p-5 border border-white/20">
            <div className="text-lg font-semibold text-white mb-1">Komunitas atau mitra desa?</div>
            <p className="text-sm text-white/80">
              <Link href="/mitra-klandesa" className="underline text-[#fde68a]">
                Bergabung program mitra distribusi paket Starter–Enterprise Klandesa
              </Link>
              .
            </p>
          </div>
        </div>

        <p className="mt-10 text-white/70 text-xs max-w-xl mx-auto">
          Persiapan awal meliputi penyesuaian hak akses per jabatan dan orientasi paket penyimpanan. Lama proses bergantung kompleksitas desa Anda.
        </p>
      </div>
    </section>
  );
}
