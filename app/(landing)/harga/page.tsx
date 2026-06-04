"use client";

import { ContactModal } from "@/components/features/ContactModal";
import { RegistrationModal } from "@/components/features/RegistrationModal";
import { TierComparison } from "@/components/features/marketing/TierComparison";
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
        "Platform Klandesa lengkap untuk operasional desa—mulai cepat dengan panduan mandiri dan dukungan standar.",
      popular: false,
      features: [
        { name: "Semua modul inti platform (admin, surat, SDGs, RPJMDes, keuangan)", included: true },
        { name: "Portal warga, PKK/BUMDes, peta wilayah & Asisten AI", included: true },
        { name: "Unduhan format Kemendesa + riwayat aktivitas", included: true },
        { name: "Akses web responsif di HP, tablet, dan komputer", included: true },
        { name: "Pelatihan daring & panduan mandiri", included: true },
        { name: "Dukungan email & chat (jam kerja)", included: true },
        { name: "Pelatihan on-site & pendamping go-live di desa", included: false },
        { name: "Aplikasi seluler bermerek desa (Android/iOS)", included: false },
        { name: "Branding portal (logo, warna, subdomain/domain desa)", included: false },
        { name: "Dashboard lintas desa untuk kabupaten/kecamatan", included: false },
      ],
      cta: "Konsultasi Gratis",
      highlight: "Untuk Desa Kecil",
      badge: "Mulai tanpa hambatan fitur",
    },
    {
      name: "Profesional",
      icon: Zap,
      description:
        "Platform yang sama, plus layanan premium: branding desa, app mobile, onboarding terarah, dan dukungan prioritas.",
      popular: true,
      features: [
        { name: "Semua modul platform (sama seperti Starter)", included: true },
        { name: "Pelatihan on-site ke kantor desa & pendamping go-live", included: true },
        { name: "Migrasi data awal dibantu tim teknis", included: true },
        { name: "Branding portal desa (logo, warna, subdomain/domain)", included: true },
        { name: "Aplikasi seluler bermerek desa (shell Android/iOS)", included: true },
        { name: "Dukungan prioritas (email, chat, telepon jam kerja)", included: true },
        { name: "Kuota penyimpanan & pengguna lebih besar (dinegosiasikan)", included: true },
        { name: "Integrasi SSO/sistem pemda & custom development", included: false },
        { name: "Dashboard lintas desa + penanggung jawab enterprise", included: false },
      ],
      cta: "Jadwalkan Demo",
      highlight: "Paling Populer",
      badge: "Premium untuk satu desa",
    },
    {
      name: "Enterprise",
      icon: Crown,
      description:
        "Untuk kabupaten/kecamatan: skala banyak desa, integrasi wilayah, SLA khusus, dan pengembangan sesuai kebijakan IT pemda.",
      popular: false,
      features: [
        { name: "Semua modul platform untuk setiap desa di wilayah", included: true },
        { name: "Dashboard lintas desa (kabupaten/kecamatan)", included: true },
        { name: "Semua layanan premium Profesional per desa", included: true },
        { name: "Aplikasi mobile custom (modul & alur disesuaikan)", included: true },
        { name: "Integrasi/SSO dengan sistem pemda (setelah assessment)", included: true },
        { name: "Custom development modul & rollout wilayah", included: true },
        { name: "SLA, engineer dedicated & review berkala", included: true },
        { name: "Pelatihan rollout wilayah & change management", included: true },
      ],
      cta: "Hubungi Sales",
      highlight: "Skala wilayah",
      badge: "Kabupaten / lintas desa",
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
        "Pembayaran dilakukan diawal dan setiap tahun melalui transfer bank (BCA, Mandiri, BNI, BRI, dll) atau sesuai mekanisme pengadaan desa. Kami juga bisa membantu proses administrasi untuk pencairan APBDes.",
    },
    {
      question: "Apakah data desa kami aman?",
      answer:
        "Kami menerapkan praktik keamanan cloud standar: koneksi HTTPS, kontrol akses berbasis peran, cadangan berkala, serta jejak audit operasional. Detail teknis dan kebutuhan compliance khusus dibahas di sesi arsitektur bersama tim IT/wilayah Anda.",
    },
    {
      question: "Apakah tersedia demo atau trial?",
      answer: "Ya! Kami menyediakan demo langsung baik online maupun on-site ke kantor desa. Untuk paket tertentu, kami juga menyediakan trial period agar tim desa bisa mencoba langsung sebelum berkomitmen. Silakan klik tombol chat di pojok kanan bawah untuk menghubungi kami.",
    },
    {
      question: "Apakah paket Starter benar-benar bisa pakai semua fitur?",
      answer:
        "Ya. Kami sengaja tidak mengunci modul inti (administrasi, surat, SDGs, RPJMDes, keuangan, portal warga, dan lainnya) agar desa bisa langsung merasakan manfaat. Yang dibedakan antar paket adalah layanan premium: seberapa dalam pendampingan, branding, aplikasi mobile, dan skala wilayah.",
    },
    {
      question: "Bagaimana dengan pelatihan untuk perangkat desa?",
      answer:
        "Starter: pelatihan daring dan panduan mandiri. Profesional: ditambah pelatihan on-site ke desa dan pendamping go-live. Enterprise: rollout wilayah, pelatihan berlapis per peran (desa–kecamatan–kabupaten), dan change management.",
    },
    {
      question: "Apakah bisa custom development untuk kebutuhan khusus?",
      answer:
        "Ya, terutama di paket Enterprise: integrasi sistem pemda, modul khusus, atau alur laporan wilayah—setelah assessment bersama tim IT Anda. Profesional bisa membahas kebutuhan terbatas (misalnya branding dan app mobile bermerek desa) tanpa proyek integrasi besar.",
    },
    {
      question: "Berapa lama proses implementasi?",
      answer:
        "Starter: aktivasi akun bisa di hari yang sama setelah pembayaran. Profesional: biasanya 1–2 minggu dengan pendamping onboarding. Enterprise: 1–2 bulan atau lebih jika melibatkan banyak desa, integrasi pemda, atau pengembangan custom.",
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
              Semua paket membuka platform Klandesa yang sama—perbedaan ada di layanan
              premium (onboarding, branding, aplikasi mobile, skala wilayah), bukan
              mengunci fitur inti. Nominal disesuaikan di proposal.
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
                <span className="text-sm text-gray-700">Program desa percontohan &amp; akses awal</span>
              </div>
              <div className="w-px h-6 bg-gray-300 hidden sm:block"></div>
              <div className="flex items-center gap-2">
                <HeadphonesIcon className="w-5 h-5 text-[#0d9488]" />
                <span className="text-sm text-gray-700">Support prioritas</span>
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
                        <li>• Modul utama dan add-on yang diaktivasi</li>
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

      <TierComparison />

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
            Diskusikan pilot desa percontohan atau paket wilayah bersama tim produk &amp; customer success kami.
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
