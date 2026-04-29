"use client";

import { ContactModal } from "@/components/features/ContactModal";
import { RegistrationModal } from "@/components/features/RegistrationModal";
import {
  Check,
  X,
  Sparkles,
  Zap,
  Crown,
  Building2,
  HelpCircle,
  ArrowRight,
  Users,
  HeadphonesIcon,
  Shield,
  ChevronDown,
} from "lucide-react";
import React from "react";

export default function PricingPage() {
  const [showRegistration, setShowRegistration] = React.useState(false);
  const [showContact, setShowContact] = React.useState(false);
  const [openFaq, setOpenFaq] = React.useState<number | null>(null);

  const plans = [
    {
      name: "Starter",
      icon: Sparkles,
      description:
        "Solusi dasar untuk desa kecil yang ingin memulai transformasi digital",
      popular: false,
      features: [
        { name: "Hingga 5 admin", included: true },
        { name: "Storage 5 GB", included: true },
        { name: "Manajemen data penduduk", included: true },
        { name: "Surat-menyurat digital", included: true },
        { name: "Dashboard statistik dasar", included: true },
        { name: "Mobile app basic", included: true },
        { name: "Support email & chat", included: true },
        { name: "Training online", included: true },
        { name: "Laporan bulanan otomatis", included: false },
        { name: "Integrasi WhatsApp notifikasi", included: false },
        { name: "Custom branding", included: false },
        { name: "API access", included: false },
        { name: "Priority support 24/7", included: false },
        { name: "On-site training", included: false },
      ],
      cta: "Konsultasi Gratis",
      highlight: "Untuk Desa Kecil",
      badge: "Populer untuk pemula",
    },
    {
      name: "Profesional",
      icon: Zap,
      description:
        "Paket lengkap untuk desa menengah dengan fitur advanced dan dukungan premium",
      popular: true,
      features: [
        { name: "Hingga 15 admin", included: true },
        { name: "Storage 20 GB", included: true },
        { name: "Semua fitur Starter", included: true },
        { name: "Dashboard analytics lengkap", included: true },
        { name: "Laporan bulanan otomatis", included: true },
        { name: "Integrasi WhatsApp notifikasi", included: true },
        { name: "Custom domain (.desa.id)", included: true },
        { name: "Mobile app premium", included: true },
        { name: "QR code & barcode scanner", included: true },
        { name: "E-signature digital", included: true },
        { name: "Priority support (email, chat, phone)", included: true },
        { name: "Training online & dokumentasi lengkap", included: true },
        { name: "Custom branding", included: false },
        { name: "On-site training", included: false },
      ],
      cta: "Jadwalkan Demo",
      highlight: "Paling Populer",
      badge: "Rekomendasi terbaik",
    },
    {
      name: "Enterprise",
      icon: Crown,
      description:
        "Solusi kustom untuk desa besar dan kecamatan dengan kebutuhan spesifik",
      popular: false,
      features: [
        { name: "Admin unlimited", included: true },
        { name: "Storage 100 GB", included: true },
        { name: "Semua fitur Profesional", included: true },
        { name: "Custom branding & white-label", included: true },
        { name: "Multi-desa management dashboard", included: true },
        { name: "Custom mobile app development", included: true },
        { name: "API access unlimited", included: true },
        // { name: "Dedicated account manager", included: true },
        { name: "Priority support 24/7 (phone, chat, email)", included: true },
        { name: "On-site training & implementasi", included: true },
        { name: "Custom development sesuai kebutuhan", included: true },
        { name: "Data migration assistance", included: true },
        { name: "SLA guarantee 99.9%", included: true },
        { name: "Konsultasi IT strategy", included: true },
      ],
      cta: "Hubungi Sales",
      highlight: "Fitur Maksimal",
      badge: "Untuk desa besar",
    },
  ];

  const faqs = [
    {
      question: "Bagaimana cara menentukan paket yang tepat untuk desa kami?",
      answer:
        "Kami akan membantu Anda menentukan paket yang tepat melalui konsultasi gratis. Tim kami akan menganalisis kebutuhan, jumlah penduduk, dan budget desa Anda untuk merekomendasikan solusi terbaik.",
    },
    {
      question: "Apakah bisa disesuaikan dengan budget APBDes kami?",
      answer:
        "Tentu! Kami memahami bahwa setiap desa memiliki alokasi budget yang berbeda. Hubungi tim kami untuk mendiskusikan paket yang sesuai dengan budget dan prioritas desa Anda.",
    },
    {
      question: "Bagaimana cara pembayarannya?",
      answer:
        "Pembayaran dilakukan secara tahunan melalui transfer bank (BCA, Mandiri, BNI, BRI) atau sesuai mekanisme pengadaan desa. Kami juga bisa membantu proses administrasi untuk pencairan APBDes.",
    },
    {
      question: "Apakah data desa kami aman?",
      answer:
        "Sangat aman! Kami menggunakan enkripsi SSL 256-bit, backup otomatis harian, dan server di Indonesia yang memenuhi standar keamanan data pemerintahan. Data desa Anda sepenuhnya terlindungi.",
    },
    {
      question: "Apakah tersedia demo atau trial?",
      answer:
        "Ya! Kami menyediakan demo langsung baik online maupun on-site ke kantor desa. Untuk paket tertentu, kami juga menyediakan trial period agar tim desa bisa mencoba langsung sebelum berkomitmen.",
    },
    {
      question: "Bagaimana dengan pelatihan untuk perangkat desa?",
      answer:
        "Semua paket sudah termasuk pelatihan. Untuk paket Starter dan Profesional tersedia pelatihan online, sedangkan paket Enterprise mendapat pelatihan on-site langsung ke desa dengan pendampingan intensif.",
    },
    {
      question: "Apakah bisa custom development untuk kebutuhan khusus?",
      answer:
        "Ya, untuk paket Enterprise kami menyediakan custom development sesuai kebutuhan spesifik desa Anda. Termasuk custom mobile app, white-label solution, dan integrasi dengan sistem existing.",
    },
    {
      question: "Berapa lama proses implementasi?",
      answer:
        "Implementasi paket Starter dan Profesional biasanya 1-2 minggu. Untuk paket Enterprise dengan custom development, prosesnya sekitar 1-2 bulan tergantung kompleksitas kebutuhan.",
    },
  ];

  return (
    <>
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-96 h-96 bg-[#0d9488] rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute top-40 right-10 w-96 h-96 bg-[#6366f1] rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-20 left-1/2 w-96 h-96 bg-[#fbbf24] rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-[#0d9488]/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-[#0d9488]/20">
              <Building2 className="w-4 h-4 text-[#0d9488]" />
              <span className="text-sm text-[#0d9488]">
                Solusi Disesuaikan Kebutuhan
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl text-gray-900 mb-6 leading-tight">
              Pilih Paket yang{" "}
              <span className="relative inline-block">
                Tepat
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  height="12"
                  viewBox="0 0 200 12"
                  fill="none"
                >
                  <path
                    d="M2 10C50 5 100 2 198 10"
                    stroke="#0d9488"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </span>{" "}
              untuk Desa Anda
            </h1>

            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Solusi yang dirancang khusus untuk kebutuhan desa di Indonesia.
              Hubungi kami untuk konsultasi dan penawaran terbaik.
            </p>

            {/* Trust Badge */}
            <div className="inline-flex flex-wrap items-center justify-center gap-6 bg-white rounded-2xl px-8 py-4 shadow-lg border border-gray-200">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#0d9488]" />
                <span className="text-sm text-gray-700">
                  Pembayaran Tahunan
                </span>
              </div>
              <div className="w-px h-6 bg-gray-300 hidden sm:block"></div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#0d9488]" />
                <span className="text-sm text-gray-700">
                  500+ Desa Terdaftar
                </span>
              </div>
              <div className="w-px h-6 bg-gray-300 hidden sm:block"></div>
              <div className="flex items-center gap-2">
                <HeadphonesIcon className="w-5 h-5 text-[#0d9488]" />
                <span className="text-sm text-gray-700">Support 24/7</span>
              </div>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {plans.map((plan, index) => {
              const Icon = plan.icon;

              return (
                <div
                  key={index}
                  className={`relative bg-white rounded-3xl p-8 transition-all duration-300 ${
                    plan.popular
                      ? "shadow-2xl scale-105 border-2 border-[#0d9488] ring-4 ring-[#0d9488]/10"
                      : "shadow-lg hover:shadow-xl border border-gray-200"
                  }`}
                >
                  {/* Popular Badge */}
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <div className="bg-linear-to-r from-[#0d9488] to-[#0f766e] text-white px-6 py-2 rounded-full text-sm shadow-lg flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        {plan.highlight}
                      </div>
                    </div>
                  )}

                  {/* Plan Header */}
                  <div className="text-center mb-6">
                    <div
                      className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 ${
                        plan.popular
                          ? "bg-linear-to-br from-[#0d9488] to-[#0f766e]"
                          : "bg-gray-100"
                      }`}
                    >
                      <Icon
                        className={`w-8 h-8 ${
                          plan.popular ? "text-white" : "text-gray-600"
                        }`}
                      />
                    </div>

                    <h3 className="text-2xl text-gray-900 mb-2">{plan.name}</h3>
                    <p className="text-sm text-gray-600 min-h-10">
                      {plan.description}
                    </p>
                  </div>

                  {/* Price - Replace with "Contact Us" */}
                  <div className="text-center mb-6 pb-6 border-b border-gray-200">
                    <div className="bg-linear-to-br from-gray-50 to-white p-6 rounded-2xl border border-gray-200">
                      <p className="text-gray-600 text-sm mb-2">
                        Harga disesuaikan dengan:
                      </p>
                      <ul className="text-sm text-gray-700 space-y-1 mb-4">
                        <li>• Jumlah penduduk desa</li>
                        <li>• Fitur yang dibutuhkan</li>
                        <li>• Budget APBDes</li>
                      </ul>
                      <button
                        onClick={() => setShowContact(true)}
                        className="text-[#0d9488] hover:text-[#0f766e] transition-colors inline-flex items-center gap-2 group"
                      >
                        <span className="underline">
                          Konsultasi untuk penawaran terbaik
                        </span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <div
                          className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                            feature.included ? "bg-[#0d9488]/10" : "bg-gray-100"
                          }`}
                        >
                          {feature.included ? (
                            <Check className="w-3 h-3 text-[#0d9488]" />
                          ) : (
                            <X className="w-3 h-3 text-gray-400" />
                          )}
                        </div>
                        <span
                          className={`text-sm ${
                            feature.included ? "text-gray-700" : "text-gray-400"
                          }`}
                        >
                          {feature.name}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <button
                    onClick={() => setShowContact(true)}
                    className={`w-full py-3 rounded-xl transition-all flex items-center justify-center gap-2 group ${
                      plan.popular
                        ? "bg-linear-to-r from-[#0d9488] to-[#0f766e] text-white hover:shadow-xl hover:scale-[1.02]"
                        : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                    }`}
                  >
                    <span>{plan.cta}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <p className="text-xs text-center text-gray-500 mt-3">
                    Konsultasi gratis tanpa komitmen
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl text-gray-900 mb-4">
              Perbandingan Lengkap Paket
            </h2>
            <p className="text-lg text-gray-600">
              Lihat detail fitur dari setiap paket untuk memilih yang terbaik
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-4 px-6 text-gray-900">Fitur</th>
                  <th className="text-center py-4 px-6 text-gray-900">
                    Starter
                  </th>
                  <th className="text-center py-4 px-6 bg-[#0d9488]/5 text-gray-900">
                    Profesional
                    <div className="text-xs text-[#0d9488] mt-1">Populer</div>
                  </th>
                  <th className="text-center py-4 px-6 text-gray-900">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[
                  {
                    category: "Pengguna & Akses",
                    items: [
                      {
                        name: "Jumlah Admin",
                        values: ["5 admin", "15 admin", "Unlimited"],
                      },
                      {
                        name: "Multi-user collaboration",
                        values: ["✓", "✓", "✓"],
                      },
                      {
                        name: "Role & permission management",
                        values: ["Basic", "Advanced", "Custom"],
                      },
                    ],
                  },
                  {
                    category: "Storage & Data",
                    items: [
                      {
                        name: "Storage space",
                        values: ["1 GB", "20 GB", "100 GB"],
                      },
                      {
                        name: "Backup otomatis",
                        values: ["Mingguan", "Harian", "Real-time"],
                      },
                      { name: "Data export", values: ["✓", "✓", "✓"] },
                    ],
                  },
                  {
                    category: "Fitur Utama",
                    items: [
                      {
                        name: "Manajemen data penduduk",
                        values: ["Basic", "Lengkap", "Advanced"],
                      },
                      {
                        name: "Surat-menyurat digital",
                        values: ["✓", "Unlimited", "Unlimited"],
                      },
                      {
                        name: "Dashboard & analytics",
                        values: ["Basic", "Advanced", "Custom"],
                      },
                      { name: "Laporan otomatis", values: ["—", "✓", "✓"] },
                      {
                        name: "Mobile app access",
                        values: ["Basic", "Premium", "Premium+Custom"],
                      },
                    ],
                  },
                  {
                    category: "Integrasi & API",
                    items: [
                      { name: "WhatsApp notifikasi", values: ["—", "✓", "✓"] },
                      { name: "API access", values: ["—", "—", "Unlimited"] },
                      { name: "Custom integration", values: ["—", "—", "✓"] },
                      { name: "White-label solution", values: ["—", "—", "✓"] },
                    ],
                  },
                  {
                    category: "Support & Training",
                    items: [
                      { name: "Email & chat support", values: ["✓", "✓", "✓"] },
                      {
                        name: "Phone support",
                        values: ["—", "Jam kerja", "24/7"],
                      },
                      { name: "Online training", values: ["✓", "✓", "✓"] },
                      { name: "On-site training", values: ["—", "—", "✓"] },
                      // {
                      //   name: "Dedicated account manager",
                      //   values: ["—", "—", "✓"],
                      // },
                    ],
                  },
                ].map((section, sectionIdx) => (
                  <React.Fragment key={sectionIdx}>
                    <tr className="bg-gray-50">
                      <td
                        colSpan={4}
                        className="py-3 px-6 text-sm text-gray-900"
                      >
                        {section.category}
                      </td>
                    </tr>
                    {section.items.map((item, itemIdx) => (
                      <tr
                        key={itemIdx}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 px-6 text-sm text-gray-600">
                          {item.name}
                        </td>
                        <td className="py-3 px-6 text-sm text-gray-900 text-center">
                          {item.values[0]}
                        </td>
                        <td className="py-3 px-6 text-sm text-gray-900 text-center bg-[#0d9488]/5">
                          {item.values[1]}
                        </td>
                        <td className="py-3 px-6 text-sm text-gray-900 text-center">
                          {item.values[2]}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-linear-to-br from-gray-50 to-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-[#0d9488]/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-[#0d9488]/20">
              <HelpCircle className="w-4 h-4 text-[#0d9488]" />
              <span className="text-sm text-[#0d9488]">FAQ</span>
            </div>

            <h2 className="text-3xl md:text-4xl text-gray-900 mb-4">
              Pertanyaan yang Sering Diajukan
            </h2>
            <p className="text-lg text-gray-600">
              Temukan jawaban untuk pertanyaan umum tentang pricing dan layanan
              kami
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-[#0d9488]/30 transition-all"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="text-gray-900 pr-4">{faq.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-500 shrink-0 transition-transform ${
                      openFaq === index ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {openFaq === index && (
                  <div className="px-6 pb-5 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-gray-600 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-4">Masih punya pertanyaan?</p>
            <button
              onClick={() => setShowContact(true)}
              className="inline-flex items-center gap-2 bg-linear-to-r from-[#0d9488] to-[#0f766e] text-white px-8 py-3 rounded-xl hover:shadow-xl transition-all hover:scale-105 group"
            >
              <span>Hubungi Tim Kami</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-linear-to-br from-[#0d9488] via-[#0f766e] to-[#0d9488] overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-blob"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#fbbf24] rounded-full mix-blend-overlay filter blur-3xl animate-blob animation-delay-2000"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-3xl md:text-4xl text-white mb-6">
            Siap Memulai Transformasi Digital?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Bergabunglah dengan 500+ desa yang telah merasakan kemudahan bersama
            Klandesa
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setShowRegistration(true)}
              className="bg-white text-[#0d9488] px-8 py-4 rounded-xl hover:shadow-2xl transition-all hover:scale-105 flex items-center justify-center gap-2 group"
            >
              <span>Daftar Sekarang</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => setShowContact(true)}
              className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-xl hover:bg-white/10 transition-all hover:scale-105"
            >
              Jadwalkan Demo
            </button>
          </div>

          <p className="mt-6 text-white/70 text-sm">
            Konsultasi gratis • Demo langsung • Solusi disesuaikan kebutuhan
          </p>
        </div>
      </section>

      {showRegistration && (
        <RegistrationModal onClose={() => setShowRegistration(false)} />
      )}
      {showContact && <ContactModal onClose={() => setShowContact(false)} />}
    </>
  );
}
