"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

const STEPS = [
  { title: "Data operasional", body: "Warga, KK, APBDes/kas desa." },
  { title: "Perencanaan", body: "RPJMDes, usulan Musdes berbobot SDGs." },
  { title: "Program lapangan", body: "PKK, BUMDes, pertanian, kegiatan RT/RW." },
  { title: "Pengukuran SDGs", body: "18 goal dari data nyata plus heatmap RT/RW." },
  { title: "Interoperabilitas", body: "Export standar + log untuk Kemendesa." },
];

export function SdgsValueChainSection() {
  return (
    <section className="py-20 md:py-28 bg-linear-to-br from-[#0f766e]/5 via-white to-[#6366f1]/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Alur platform operasional desa
          </h2>
          <p className="text-gray-600">
            Klandesa menghubungkan operasional desa dengan pilar SDGs dan
            kesiapan interoperabilitas dalam satu platform.
          </p>
        </div>
        <div className="flex flex-col lg:flex-row lg:items-stretch gap-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="flex lg:flex-row items-start gap-2 flex-1">
              <div className="flex-1 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm min-h-[140px]">
                <div className="text-xs font-medium text-[#0d9488] mb-1">
                  Langkah {i + 1}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-600">{s.body}</p>
              </div>
              {i < STEPS.length - 1 && (
                <ChevronRight className="hidden lg:block w-8 h-8 text-gray-300 shrink-0 mt-14" />
              )}
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            href="/platform/sdgs"
            className="inline-flex items-center rounded-xl bg-[#0d9488] px-6 py-3 text-white text-sm font-medium hover:bg-[#0f766e] transition-colors"
          >
            Pelajari stack SDGs
          </Link>
        </div>
      </div>
    </section>
  );
}
