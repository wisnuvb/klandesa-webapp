import React from 'react';
import { Check, X } from 'lucide-react';

export function BenefitsSection() {
  const withoutKlandesa = [
    'Proses administrasi yang rumit dan memakan waktu',
    'Kurang transparansi dalam layanan desa',
    'Akses informasi yang terbatas',
    'Pelayanan tidak terintegrasi',
    'Kesulitan dalam pelaporan dan dokumentasi',
  ];

  const withKlandesa = [
    'Proses administrasi cepat dan efisien',
    'Transparansi penuh dalam setiap layanan',
    'Akses informasi real-time kapan saja',
    'Semua layanan terintegrasi dalam satu platform',
    'Pelaporan dan dokumentasi otomatis',
  ];

  return (
    <section
      id="manfaat"
      className="relative py-20 md:py-32 bg-gradient-to-b from-white via-[#f0f4ff] to-white overflow-hidden"
    >
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#6366f1] rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-[#0d9488] rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(#0d9488 1px, transparent 1px), linear-gradient(90deg, #0d9488 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        ></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-[#0d9488]/20 mb-4">
            <div className="w-2 h-2 bg-[#0d9488] rounded-full animate-pulse"></div>
            <span className="text-sm text-[#0d9488]">Transformasi Digital</span>
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl text-gray-900 mb-4 leading-tight">
            Manfaat{' '}
            <span className="bg-gradient-to-r from-[#0d9488] to-[#6366f1] bg-clip-text text-transparent">
              Klandesa
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Lihat perbedaan sebelum dan sesudah menggunakan Klandesa
          </p>
        </div>

        {/* Comparison Cards */}
        <div className="grid md:grid-cols-2 gap-8 relative">
          {/* VS Badge - Hidden on mobile, shown on desktop */}
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <div className="bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] text-white px-6 py-3 rounded-full shadow-2xl border-4 border-white">
              <span className="text-xl">VS</span>
            </div>
          </div>

          {/* Without Klandesa */}
          <div className="group relative bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
            {/* Decorative corner */}
            <div className="absolute top-0 left-0 w-24 h-24 bg-red-500/5 rounded-br-full"></div>
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-red-500/5 rounded-tl-full"></div>

            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-gradient-to-br from-red-100 to-red-200 p-4 rounded-2xl shadow-md group-hover:scale-110 transition-transform duration-300">
                  <X className="w-7 h-7 text-red-600" />
                </div>
                <div>
                  <h3 className="text-2xl text-gray-900">Tanpa Klandesa</h3>
                  <p className="text-sm text-gray-500">Cara Konvensional</p>
                </div>
              </div>

              <ul className="space-y-4">
                {withoutKlandesa.map((item, index) => (
                  <li key={index} className="flex gap-3 group/item">
                    <div className="bg-red-100 p-1 rounded-lg h-fit group-hover/item:scale-110 transition-transform">
                      <X className="w-4 h-4 text-red-600 flex-shrink-0" />
                    </div>
                    <span className="text-gray-700 leading-relaxed">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Bottom decoration */}
              <div className="mt-8 pt-6 border-t border-gray-100">
                <div className="flex items-center gap-2 text-red-600">
                  <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                  <span className="text-sm">Metode Lama</span>
                </div>
              </div>
            </div>
          </div>

          {/* With Klandesa */}
          <div className="group relative bg-gradient-to-br from-[#0d9488] via-[#0f766e] to-[#0d9488] rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] overflow-hidden">
            {/* Animated background shapes */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 group-hover:scale-150 transition-transform duration-700"></div>

            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl shadow-md border border-white/30 group-hover:scale-110 transition-transform duration-300">
                  <Check className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl text-white">Dengan Klandesa</h3>
                  <p className="text-sm text-white/80">Solusi Modern</p>
                </div>
              </div>

              <ul className="space-y-4">
                {withKlandesa.map((item, index) => (
                  <li key={index} className="flex gap-3 group/item">
                    <div className="bg-[#fbbf24] p-1 rounded-lg h-fit group-hover/item:scale-110 transition-transform shadow-md">
                      <Check className="w-4 h-4 text-gray-900 flex-shrink-0" />
                    </div>
                    <span className="text-white leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>

              {/* Bottom decoration */}
              <div className="mt-8 pt-6 border-t border-white/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#fbbf24]">
                    <div className="w-2 h-2 bg-[#fbbf24] rounded-full animate-pulse"></div>
                    <span className="text-sm text-white">
                      Transformasi Digital
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full">
                    <span className="text-xs text-white">✓ Recommended</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-12">
          <p className="text-gray-600 mb-6">Siap untuk transformasi digital?</p>
          <button className="bg-gradient-to-r from-[#0d9488] to-[#0f766e] text-white px-8 py-4 rounded-xl hover:shadow-xl transition-all hover:scale-105 shadow-lg">
            Mulai Transformasi Sekarang
          </button>
        </div>
      </div>
    </section>
  );
}
