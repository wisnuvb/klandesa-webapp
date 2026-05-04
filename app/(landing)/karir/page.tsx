"use client";

import Link from "next/link";
import { ArrowRight, Handshake, MapPin, TrendingUp, Users } from "lucide-react";

export default function KarirPage() {
  return (
    <div className="min-h-[calc(100vh-80px)]">
      <div className="relative bg-linear-to-br from-[#0d9488] via-[#0f766e] to-[#0d9488] px-8 pt-32 pb-20 md:px-12 md:pt-40 md:pb-24 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-blob" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#6366f1] rounded-full mix-blend-overlay filter blur-3xl animate-blob animation-delay-2000" />
          <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-[#fbbf24] rounded-full mix-blend-overlay filter blur-3xl animate-blob animation-delay-4000" />
        </div>
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle, white 1px, transparent 1px)",
              backgroundSize: "30px 30px",
            }}
          />
        </div>

        <div className="relative z-10 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-white/30">
            <Users className="w-4 h-4 text-[#fbbf24]" />
            <span className="text-white text-sm">Karir & kemitraan</span>
          </div>

          <h1 className="text-4xl md:text-5xl text-white mb-4 font-semibold tracking-tight">
            Karir di Klandesa
          </h1>
          <p className="text-white/90 text-lg md:text-xl max-w-2xl mx-auto">
            Saat ini kami membuka program kemitraan. Lowongan lain akan
            ditambahkan di halaman ini.
          </p>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-12 md:py-16 max-w-6xl mx-auto -mt-6 sm:-mt-10 relative z-10">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 text-sm text-gray-600">
                <Handshake className="w-4 h-4 text-[#0d9488]" />
                Program Mitra
              </div>
              <h2 className="text-2xl text-gray-900 font-semibold">
                Mitra Klandesa
              </h2>
              <p className="text-gray-600">
                Cocok untuk konsultan desa, relasi pemda, atau komunitas yang
                ingin membantu digitalisasi layanan desa.
              </p>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-gray-700">
                  <TrendingUp className="w-4 h-4 text-[#0d9488]" />
                  Komisi per closing
                </span>
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-gray-700">
                  <MapPin className="w-4 h-4 text-[#0d9488]" />
                  Fokus wilayah
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/mitra-klandesa"
                className="inline-flex items-center justify-center gap-2 bg-linear-to-r from-[#0d9488] to-[#0f766e] text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-all shrink-0"
              >
                Lihat detail
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/mitra-klandesa#daftar-mitra"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-medium border border-gray-300 text-gray-800 hover:bg-gray-50 transition-colors"
              >
                Daftar
              </Link>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-500 text-center mt-8">
          Punya pertanyaan?{" "}
          <Link href="/#kontak" className="text-[#0d9488] hover:underline">
            Hubungi kami
          </Link>
        </p>
      </div>
    </div>
  );
}
