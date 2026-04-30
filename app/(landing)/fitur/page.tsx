"use client";

import {
  Database,
  DollarSign,
  FileText,
  Users,
  BarChart3,
  Globe,
  Shield,
  Smartphone,
  Clock,
  Download,
  CheckCircle2,
  Zap,
  TrendingUp,
  Lock,
  Cloud,
  Bell,
  Settings,
  Store,
} from "lucide-react";
import Link from "next/link";

export default function FeaturesPage() {
  const features = [
    {
      icon: Database,
      title: "Manajemen Data Desa",
      description:
        "Kelola seluruh data kependudukan dan administrasi desa secara digital dan terstruktur",
      benefits: [
        "Database penduduk terintegrasi",
        "Pencarian data cepat dan akurat",
        "Export data ke berbagai format",
        "Backup otomatis setiap hari",
      ],
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      icon: DollarSign,
      title: "Sistem Keuangan Desa",
      description:
        "Transparansi pengelolaan keuangan desa dengan sistem akuntansi yang mudah dan akurat",
      benefits: [
        "Pencatatan keuangan real-time",
        "Laporan APBDes otomatis",
        "Tracking penggunaan dana",
        "Audit trail lengkap",
      ],
      color: "from-green-500 to-emerald-500",
      bgColor: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      icon: FileText,
      title: "Pelayanan Surat Online",
      description:
        "Permudah warga dalam mengurus surat-menyurat tanpa harus datang ke kantor desa",
      benefits: [
        "Pengajuan surat online 24/7",
        "Template surat lengkap",
        "Tracking status permohonan",
        "Notifikasi real-time",
      ],
      color: "from-purple-500 to-pink-500",
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600",
    },
    {
      icon: Users,
      title: "Portal Warga",
      description:
        "Platform komunikasi dan informasi antara pemerintah desa dengan warga",
      benefits: [
        "Pengumuman dan berita desa",
        "Forum diskusi warga",
        "Pengaduan masyarakat",
        "Galeri kegiatan desa",
      ],
      color: "from-orange-500 to-red-500",
      bgColor: "bg-orange-50",
      iconColor: "text-orange-600",
    },
    {
      icon: BarChart3,
      title: "Laporan & Statistik",
      description:
        "Dashboard analitik untuk memantau perkembangan dan kinerja desa secara visual",
      benefits: [
        "Dashboard interaktif",
        "Grafik dan chart dinamis",
        "Export laporan PDF/Excel",
        "Analisis data otomatis",
      ],
      color: "from-teal-500 to-cyan-500",
      bgColor: "bg-teal-50",
      iconColor: "text-teal-600",
    },
    {
      icon: Globe,
      title: "Website Desa",
      description:
        "Website profesional untuk profil dan informasi desa yang dapat diakses publik",
      benefits: [
        "Desain modern dan responsif",
        "SEO friendly",
        "Mudah di-update",
        "Domain gratis .desa.id",
      ],
      color: "from-indigo-500 to-blue-500",
      bgColor: "bg-indigo-50",
      iconColor: "text-indigo-600",
    },
    {
      icon: Shield,
      title: "Keamanan Data",
      description:
        "Sistem keamanan berlapis untuk melindungi data sensitif desa dan warga",
      benefits: [
        "Enkripsi data end-to-end",
        "Multi-level user access",
        "Login dengan 2FA",
        "Backup terenkripsi",
      ],
      color: "from-red-500 to-pink-500",
      bgColor: "bg-red-50",
      iconColor: "text-red-600",
    },
    {
      icon: Smartphone,
      title: "Mobile Responsive",
      description:
        "Akses sistem dari berbagai perangkat, kapan saja dan dimana saja",
      benefits: [
        "Aplikasi web responsive",
        "Optimasi untuk mobile",
        "Akses offline terbatas",
        "Sinkronisasi otomatis",
      ],
      color: "from-yellow-500 to-orange-500",
      bgColor: "bg-yellow-50",
      iconColor: "text-yellow-600",
    },
    {
      icon: Clock,
      title: "Absensi Perangkat",
      description:
        "Sistem presensi digital untuk perangkat desa dengan teknologi modern",
      benefits: [
        "Check-in/out mudah",
        "Laporan kehadiran otomatis",
        "GPS tracking lokasi",
        "Rekap bulanan",
      ],
      color: "from-pink-500 to-rose-500",
      bgColor: "bg-pink-50",
      iconColor: "text-pink-600",
    },
    {
      icon: Download,
      title: "Arsip Digital",
      description:
        "Penyimpanan dan pengelolaan dokumen desa secara digital dan terorganisir",
      benefits: [
        "Storage unlimited",
        "Pencarian dokumen cepat",
        "Kategorisasi otomatis",
        "Akses berbasis role",
      ],
      color: "from-cyan-500 to-blue-500",
      bgColor: "bg-cyan-50",
      iconColor: "text-cyan-600",
    },
    {
      icon: Store,
      title: "UKM Desa",
      description:
        "Platform digital untuk promosi dan manajemen UMKM lokal, tingkatkan ekonomi desa",
      benefits: [
        "Direktori UMKM desa",
        "Katalog produk online",
        "Marketplace terintegrasi",
        "Statistik penjualan",
      ],
      color: "from-amber-500 to-orange-500",
      bgColor: "bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      icon: Bell,
      title: "Notifikasi Pintar",
      description:
        "Sistem pemberitahuan otomatis untuk berbagai aktivitas dan pengingat penting",
      benefits: [
        "Push notification",
        "Email notification",
        "Pengingat deadline",
        "Alert custom",
      ],
      color: "from-violet-500 to-purple-500",
      bgColor: "bg-violet-50",
      iconColor: "text-violet-600",
    },
    {
      icon: Settings,
      title: "Kustomisasi Sistem",
      description:
        "Sesuaikan sistem dengan kebutuhan dan karakteristik unik desa Anda",
      benefits: [
        "Setting fleksibel",
        "Template customizable",
        "Workflow adjustment",
        "Support konsultasi",
      ],
      color: "from-slate-500 to-gray-500",
      bgColor: "bg-slate-50",
      iconColor: "text-slate-600",
    },
  ];

  const additionalFeatures = [
    { icon: Zap, text: "Performa cepat dan stabil" },
    { icon: TrendingUp, text: "Update fitur berkala" },
    { icon: Lock, text: "Compliance dengan regulasi" },
    { icon: Cloud, text: "Cloud-based infrastructure" },
  ];

  return (
    <>
      {/* Header */}
      <div className="relative bg-linear-to-br from-[#0d9488] via-[#0f766e] to-[#0d9488] px-8 pt-32 pb-20 md:px-12 md:pt-40 md:pb-24 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-blob"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#6366f1] rounded-full mix-blend-overlay filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-[#fbbf24] rounded-full mix-blend-overlay filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>

        {/* Dot Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle, white 1px, transparent 1px)",
              backgroundSize: "30px 30px",
            }}
          ></div>
        </div>

        <div className="relative z-10 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-white/30">
            <Zap className="w-4 h-4 text-[#fbbf24]" />
            <span className="text-white text-sm">
              Fitur Lengkap untuk Desa Digital
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl text-white mb-4">
            Fitur Unggulan Klandesa
          </h1>
          <p className="text-white/90 text-lg md:text-xl max-w-2xl mx-auto">
            Platform all-in-one untuk transformasi digital desa dengan fitur
            lengkap dan mudah digunakan
          </p>
        </div>
      </div>

      {/* Features Grid */}
      <div className="px-4 sm:px-6 lg:px-8 py-12 md:py-16 max-w-7xl mx-auto -mt-12 relative z-10">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-[#0d9488] transition-all duration-300 hover:shadow-xl group"
            >
              {/* Icon */}
              <div
                className={`inline-flex p-4 rounded-xl bg-linear-to-br ${feature.color} mb-4 group-hover:scale-110 transition-transform`}
              >
                <feature.icon className="w-8 h-8 text-white" />
              </div>

              {/* Title */}
              <h3 className="text-xl text-gray-900 mb-2 group-hover:text-[#0d9488] transition-colors">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                {feature.description}
              </p>

              {/* Benefits */}
              <div className="space-y-2">
                {feature.benefits.map((benefit, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#0d9488] shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Additional Features */}
        <div className="bg-linear-to-br from-gray-50 to-gray-100 rounded-2xl p-8 border border-gray-200 mb-12">
          <h3 className="text-2xl text-gray-900 mb-6 text-center">
            Keunggulan Lainnya
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {additionalFeatures.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 bg-white rounded-xl p-4 border border-gray-200 hover:border-[#0d9488] transition-all hover:shadow-md"
              >
                <div className="bg-[#0d9488]/10 p-2 rounded-lg">
                  <item.icon className="w-5 h-5 text-[#0d9488]" />
                </div>
                <span className="text-sm text-gray-700">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-linear-to-br from-[#0d9488] to-[#0f766e] rounded-2xl p-8 md:p-10 text-center relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(circle, white 1px, transparent 1px)",
                backgroundSize: "30px 30px",
              }}
            ></div>
          </div>

          <div className="relative z-10">
            <h3 className="text-2xl md:text-3xl text-white mb-3">
              Siap Transformasi Desa Anda?
            </h3>
            <p className="text-white/90 mb-6 max-w-2xl mx-auto">
              Bergabunglah dengan ratusan desa yang telah merasakan kemudahan
              digitalisasi bersama Klandesa
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/daftar"
                className="bg-white text-[#0d9488] px-8 py-3.5 rounded-xl hover:shadow-xl transition-all hover:scale-105"
              >
                Daftar Sekarang
              </Link>
              <Link
                href="/kontak"
                className="bg-transparent border-2 border-white text-white px-8 py-3.5 rounded-xl hover:bg-white/10 transition-all backdrop-blur-sm"
              >
                Hubungi Kami
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
