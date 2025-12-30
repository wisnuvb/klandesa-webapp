import React from 'react';
import { ArrowRight, MapPin, TrendingUp, Users, Zap } from 'lucide-react';

import { ImageWithFallback } from './figma/ImageWithFallback';

function Sparkles({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
      />
    </svg>
  );
}

interface HeroSectionProps {
  onRegisterClick: () => void;
}

export function HeroSection({ onRegisterClick }: HeroSectionProps) {
  return (
    <section
      id="home"
      className="relative bg-gradient-to-br from-[#f0f9ff] via-[#f0f4ff] to-[#fef3c7] py-20 md:py-32 overflow-hidden"
    >
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-72 h-72 bg-[#0d9488] rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute top-0 right-10 w-72 h-72 bg-[#6366f1] rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-[#fbbf24] rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      {/* Dot Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle, #0d9488 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }}
        ></div>
      </div>

      {/* Floating Shapes */}
      <div className="absolute top-20 right-1/4 w-16 h-16 border-4 border-[#6366f1]/20 rounded-lg rotate-12 animate-float"></div>
      <div className="absolute bottom-32 left-1/4 w-12 h-12 bg-[#fbbf24]/20 rounded-full animate-float animation-delay-2000"></div>
      <div className="absolute top-1/2 right-10 w-20 h-20 border-4 border-[#0d9488]/20 rounded-full animate-float animation-delay-4000"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-6">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-[#0d9488]/20">
              <Sparkles className="w-4 h-4 text-[#fbbf24]" />
              <span className="text-sm text-gray-700">
                Solusi Digital Terpercaya untuk Desa
              </span>
            </div>

            <div className="relative">
              <h1 className="text-5xl md:text-3xl lg:text-5xl text-gray-900 leading-[1.1] tracking-tight font-extrabold flex flex-col gap-2">
                Akses Lebih Cepat,
                <span className="bg-gradient-to-r from-[#0d9488] via-[#0ea5e9] to-[#6366f1] bg-clip-text text-transparent animate-gradient">
                  Layanan Lebih Baik
                </span>
              </h1>
            </div>

            <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
              Pelayanan Desa yang Terdepan: Aplikasi Klandesa Kami Melayani
              Kebutuhan Anda dengan Praktis dan Efisien.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm">
                <Zap className="w-4 h-4 text-[#fbbf24]" />
                <span className="text-sm text-gray-700">Proses Cepat</span>
              </div>
              <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm">
                <TrendingUp className="w-4 h-4 text-[#0d9488]" />
                <span className="text-sm text-gray-700">100% Terintegrasi</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button
                onClick={onRegisterClick}
                className="group relative bg-gradient-to-r from-[#0d9488] to-[#0f766e] text-white px-8 py-4 rounded-xl hover:shadow-2xl transition-all hover:scale-105 flex items-center justify-center gap-2"
              >
                Daftar Sekarang
                <ArrowRight className="w-5 h-5" />
              </button>
              <button className="bg-white/80 backdrop-blur-sm text-gray-900 px-8 py-4 rounded-xl hover:bg-white transition-all border border-gray-200 shadow-md hover:shadow-lg">
                Lihat Fitur
              </button>
            </div>

            {/* Social Proof */}
            <div className="flex items-center gap-6 pt-6">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0d9488] to-[#6366f1] border-2 border-white"
                  ></div>
                ))}
              </div>
              <div>
                <div className="text-sm text-gray-900">100,000+ Pengguna</div>
                <div className="text-xs text-gray-500">
                  Dipercaya oleh 500+ Desa
                </div>
              </div>
            </div>
          </div>

          {/* Right Content - Hero Image */}
          <div className="flex justify-center md:justify-end relative">
            {/* Decorative card behind image */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0d9488]/10 to-[#6366f1]/10 rounded-3xl transform rotate-3 scale-95"></div>

            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1671080749889-19f8a69deb2b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaWdpdGFsJTIwdHJhbnNmb3JtYXRpb24lMjB2aWxsYWdlfGVufDF8fHx8MTc2NTQyODg0OHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Klandesa - Platform Digital Desa"
                className="w-full max-w-lg h-auto relative z-10"
              />
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d9488]/20 to-transparent"></div>
            </div>

            {/* Floating Stats Card */}
            <div className="absolute -bottom-6 -left-6 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-gray-100 hidden md:block z-10">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-[#0d9488] to-[#0f766e] p-3 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl text-gray-900">98%</div>
                  <div className="text-xs text-gray-500">Kepuasan Pengguna</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
