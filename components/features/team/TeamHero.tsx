"use client";

import { Users } from "lucide-react";

export function TeamHero() {
  return (
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
          <span className="text-white text-sm">Tim pendiri</span>
        </div>

        <h1 className="text-4xl md:text-5xl text-white mb-4 font-semibold tracking-tight">
          Orang-orang di balik Klandesa
        </h1>
        <p className="text-white/90 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
          Kami menyatukan keahlian teknologi, strategi komunikasi, dan
          pengembangan produk digital untuk membantu desa bertransformasi dengan
          layanan yang andal, mudah diadopsi, dan berpihak pada warga.
        </p>
      </div>
    </div>
  );
}
