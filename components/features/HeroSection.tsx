import { ArrowRight, Sparkles, Target } from "lucide-react";
import Link from "next/link";

/** Dekoratif hero: satu lapisan absolute penuh, aksen lebih kuat di kanan. */
function HeroBackdropDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-y-0 right-0 w-full max-w-[min(100%,42rem)] bg-linear-to-bl from-[#6366f1]/6 via-transparent to-teal-200/18 md:to-teal-200/22" />

      <svg
        className="absolute right-[-10%] top-1/2 h-[min(125%,46rem)] w-auto -translate-y-1/2 text-[#0d9488] opacity-[0.1] md:opacity-[0.12]"
        viewBox="0 0 400 420"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="320" cy="80" r="120" stroke="currentColor" strokeWidth="1.25" />
        <circle cx="280" cy="200" r="180" stroke="currentColor" strokeWidth="0.9" opacity="0.7" />
        <circle cx="340" cy="300" r="90" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <path d="M 40 360 Q 140 260 260 340 T 380 200" stroke="currentColor" strokeWidth="1" opacity="0.45" />
        <path d="M 120 420 L 200 280 L 300 340 L 380 200" stroke="currentColor" strokeWidth="0.8" opacity="0.35" strokeDasharray="6 10" />
      </svg>

      <div
        className="absolute inset-0 opacity-[0.07] md:opacity-[0.09]"
        style={{
          backgroundImage: `
            linear-gradient(135deg, #0f766e 1px, transparent 1px),
            linear-gradient(45deg, #6366f1 0.8px, transparent 0.8px)
          `,
          backgroundSize: "40px 40px",
          maskImage:
            "linear-gradient(to left, black 28%, transparent 72%)",
          WebkitMaskImage:
            "linear-gradient(to left, black 28%, transparent 72%)",
        }}
      />

      <div className="absolute bottom-[-5%] right-[5%] h-72 w-72 rounded-full blur-3xl bg-[#0d9488]/18" />
      <div className="absolute top-[10%] right-[15%] h-56 w-56 rounded-full blur-3xl bg-[#6366f1]/22" />
    </div>
  );
}

interface HeroSectionProps {
  onRegisterClick: () => void;
  onContactClick: () => void;
}

export function HeroSection({
  onRegisterClick,
  onContactClick,
}: HeroSectionProps) {
  return (
    <section
      id="home"
      className="relative py-20 md:py-32 overflow-hidden"
    >
      <HeroBackdropDecor />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-6">
        <div className="max-w-xl lg:max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-[#0d9488]/20">
            <Target className="w-4 h-4 text-[#0d9488]" aria-hidden />
            <span className="text-sm text-gray-700">
              Platform operasional desa • berbasis SDGs
            </span>
          </div>

          <h1 className="text-4xl md:text-3xl lg:text-5xl text-gray-900 leading-[1.1] tracking-tight font-extrabold flex flex-col gap-2">
            Administrasi sampai Pelaporan
            <span className="bg-linear-to-r from-[#0d9488] via-[#0ea5e9] to-[#6366f1] bg-clip-text text-transparent animate-gradient">
              Dalam satu platform cerdas
            </span>
          </h1>
        </div>

        <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-none w-full">
          Klandesa menghubungkan surat daring, APBDes dengan penanda sasaran SDGs,
          perencanaan RPJMDes, program PKK &amp; BUMDes, serta export format interoperability
          Kemendesa—dengan tata akses untuk perangkat dan pemda.
        </p>

        <div className="max-w-xl lg:max-w-2xl space-y-6">
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 bg-white/70 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-teal-100">
              <Sparkles className="w-4 h-4 text-amber-500" aria-hidden />
              <span className="text-sm text-gray-700">Engine skor SDGs dari data hidup desa</span>
            </div>
            <div className="flex items-center gap-2 bg-white/70 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-indigo-100">
              <span className="text-sm text-gray-700">Adapter export + audit log Kemendesa</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <Link
              href="/platform"
              className="group inline-flex items-center justify-center gap-2 bg-linear-to-r from-[#0d9488] to-[#0f766e] text-white px-8 py-4 rounded-xl hover:shadow-xl transition-all hover:scale-[1.02]"
            >
              Lihat Platform
              <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <button
              type="button"
              onClick={onContactClick}
              className="bg-white text-gray-900 px-8 py-4 rounded-xl border border-gray-200 shadow hover:shadow-md transition-all"
            >
              Konsultasi Gratis
            </button>
            <button
              type="button"
              onClick={onRegisterClick}
              className="text-[#0d9488] font-medium px-2 py-4 hover:underline"
            >
              Daftar sekarang
            </button>
          </div>

          <div className="rounded-2xl border border-teal-100 bg-white/75 px-4 py-3 text-sm text-gray-700 max-w-md">
            <strong className="text-[#0d9488]">Early Access:</strong> modul seperti SDGs, RPJMDes, GIS,
            integrasi Kemendesa, dan Asisten AI sedang dibuka bertahap untuk desa pilot—hubungi CS untuk akses kontrol.
          </div>
        </div>
      </div>
    </section>
  );
}
