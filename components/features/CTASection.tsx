import React from 'react';
import { ArrowRight } from 'lucide-react';

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
      {/* Animated Background Shapes */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-blob"></div>
        <div className="absolute top-1/2 right-0 w-96 h-96 bg-[#fbbf24] rounded-full mix-blend-overlay filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        ></div>
      </div>

      {/* Floating Shapes */}
      <div className="absolute top-10 right-10 w-20 h-20 border-4 border-white/20 rounded-2xl rotate-12 animate-float"></div>
      <div className="absolute bottom-20 left-10 w-16 h-16 border-4 border-[#fbbf24]/30 rounded-full animate-float animation-delay-2000"></div>
      <div className="absolute top-1/2 left-1/4 w-12 h-12 bg-white/10 rounded-lg rotate-45 animate-float animation-delay-4000"></div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-white/30 mb-6">
          <div className="w-2 h-2 bg-[#fbbf24] rounded-full animate-pulse"></div>
          <span className="text-sm text-white">Bergabunglah Sekarang</span>
        </div>

        {/* Main Heading */}
        <h2 className="text-4xl md:text-5xl lg:text-6xl text-white mb-6 leading-tight">
          Siap{' '}
          <span className="relative inline-block">
            Transformasi
            <svg
              className="absolute -bottom-2 left-0 w-full"
              height="12"
              viewBox="0 0 200 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2 10C50 5 100 2 198 10"
                stroke="#fbbf24"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </span>{' '}
          Desa Anda?
        </h2>

        <p className="text-xl md:text-2xl text-white/90 mb-12 max-w-3xl mx-auto leading-relaxed">
          Bergabunglah dengan ribuan desa lainnya yang telah merasakan kemudahan
          layanan digital bersama Klandesa
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pb-12">
          <button
            onClick={onRegisterClick}
            className="group relative bg-white text-[#0d9488] px-8 py-4 rounded-xl hover:shadow-2xl transition-all hover:scale-105 flex items-center justify-center gap-2"
          >
            <span>Daftar Sekarang</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={onContactClick}
            className="relative bg-transparent border-2 border-white text-white px-8 py-4 rounded-xl hover:bg-white/10 transition-all backdrop-blur-sm hover:scale-105 hover:border-[#fbbf24] hover:text-[#fbbf24] group"
          >
            <span>Hubungi Kami</span>
          </button>
        </div>

        {/* Trust Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all hover:scale-105">
            <div className="text-3xl md:text-4xl text-white mb-2">500+</div>
            <div className="text-sm text-white/80">Desa Terdaftar</div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all hover:scale-105">
            <div className="text-3xl md:text-4xl text-white mb-2">99%</div>
            <div className="text-sm text-white/80">Kepuasan</div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all hover:scale-105">
            <div className="text-3xl md:text-4xl text-white mb-2">24/7</div>
            <div className="text-sm text-white/80">Support</div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all hover:scale-105">
            <div className="text-3xl md:text-4xl text-white mb-2">
              <span className="text-[#fbbf24]">✓</span> Aman
            </div>
            <div className="text-sm text-white/80">Terpercaya</div>
          </div>
        </div>

        {/* Bottom Note */}
        <div className="mt-12 inline-flex items-center gap-2 text-white/70 text-sm">
          <svg
            className="w-5 h-5 text-[#fbbf24]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <span>Proses pendaftaran cepat, hanya 5 menit</span>
        </div>
      </div>
    </section>
  );
}
