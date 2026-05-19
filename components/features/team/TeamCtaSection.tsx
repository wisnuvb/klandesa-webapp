"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function TeamCtaSection() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 pb-16 md:pb-24 max-w-6xl mx-auto -mt-8 md:-mt-12 relative z-10">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-10 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div className="space-y-3 max-w-xl">
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900">
              Ingin berkolaborasi?
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Tim kami siap mendengar kebutuhan desa Anda — dari demo produk,
              diskusi implementasi, hingga program kemitraan untuk memperluas
              dampak digitalisasi di wilayah Anda.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link
              href="/mitra-klandesa"
              className="inline-flex items-center justify-center gap-2 bg-linear-to-r from-[#0d9488] to-[#0f766e] text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-all"
            >
              Lihat program mitra
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-medium border border-gray-300 text-gray-800 hover:bg-gray-50 transition-colors"
            >
              Coba demo
            </Link>
          </div>
        </div>

        <p className="text-xs text-gray-500 text-center mt-8 pt-8 border-t border-gray-100">
          Ada pertanyaan lain?{" "}
          <Link href="/#kontak" className="text-[#0d9488] hover:underline">
            Hubungi kami
          </Link>
        </p>
      </div>
    </div>
  );
}
