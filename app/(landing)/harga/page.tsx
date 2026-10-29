"use client";

import { ContactModal } from "@/components/features/ContactModal";
import { RegistrationModal } from "@/components/features/RegistrationModal";
import { BILLING_CATALOG, formatIdr } from "@/lib/billing/catalog";
import { AI_CREDIT_PACKAGES, AI_FREE_CREDITS } from "@/lib/ai/credit-packages";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Check,
  Sparkles,
  Building2,
  HelpCircle,
  ArrowRight,
  Users,
  HeadphonesIcon,
  Shield,
  ChevronDown,
  Smartphone,
  Landmark,
  HardDrive,
  Bot,
  Globe,
  MapPin,
} from "lucide-react";
import React from "react";

const LENGKAP = BILLING_CATALOG.desa_package.tiers.lengkap;
const ARSIP = BILLING_CATALOG.arsip.tiers;
const INCLUDED_STORAGE_GB = ARSIP.starter.storageGb;
const FIRST_AI_PACKAGE = AI_CREDIT_PACKAGES[0];

/** Poin terpenting yang tampil di kartu harga; daftar lengkap ada di modal (includedGroups). */
const highlights = [
  "Data warga, kartu keluarga, dan perangkat desa",
  "Layanan surat dan permohonan warga online",
  "Pengaduan warga dan pengumuman desa",
  "Aplikasi seluler untuk warga, RT, dan perangkat desa",
  "Keuangan Desa, BUMDes, dan PKK & Posyandu",
  "SDGs Desa, RPJMDes, dan peta infrastruktur",
];

const includedGroups = [
  {
    title: "Administrasi & kependudukan",
    items: [
      "Data warga, kartu keluarga, perangkat desa, dan struktur jabatan",
      "Statistik penduduk, profil & kop surat desa",
    ],
  },
  {
    title: "Layanan surat & warga",
    items: [
      "Template surat, antrian permohonan, dan kiosk layanan mandiri",
      "Pengaduan warga, pengumuman, dan bantuan/program keluarga",
    ],
  },
  {
    title: "Aplikasi seluler warga & perangkat",
    items: [
      "Aplikasi untuk warga, perangkat desa, dan RT (pengantar surat, siaran)",
      "Warga: kabar desa dengan foto, komentar, dan moderasi — bisa dimatikan desa",
      "Kuota foto aplikasi seluler 5 GB per desa (setara belasan ribu foto)",
    ],
  },
  {
    title: "Keuangan & usaha desa",
    items: [
      "Keuangan Desa: pembukuan kas dan laporan",
      "BUMDes dan PKK & Posyandu",
    ],
  },
  {
    title: "Perencanaan & pelaporan",
    items: [
      "Skor SDGs Desa dan RPJMDes",
      "Peta infrastruktur (GIS)",
      "Sinkronisasi & ekspor data (integrasi resmi dibahas setelah assessment)",
    ],
  },
  {
    title: "Program lapangan",
    items: [
      "Lingkungan Hidup, Pertanian, dan Kegiatan RT/RW",
      "Potensi desa, ringkasan anggaran, koperasi, dan UMKM",
    ],
  },
  {
    title: "Operasional & pendampingan",
    items: [
      "Absensi perangkat desa (QR): hingga 10 perangkat, riwayat 30 hari",
      `Arsip digital dengan kuota ${INCLUDED_STORAGE_GB} GB`,
      "Pelatihan daring, panduan mandiri, dan dukungan email & chat (jam kerja)",
    ],
  },
];

const includedCount = includedGroups.reduce((sum, g) => sum + g.items.length, 0);

const storageTiers = [ARSIP.professional, ARSIP.business, ARSIP.enterprise, ARSIP.promax];

const faqs = [
  {
    question: "Berapa biaya yang harus dibayar desa?",
    answer: `Biaya awal ${formatIdr(LENGKAP.setupFee)} sudah termasuk 12 bulan pertama. Mulai tahun ke-2 desa membayar ${formatIdr(LENGKAP.monthlyFee)} per bulan (setara ${formatIdr(LENGKAP.annualFee)} per tahun). Tidak ada biaya awal kedua saat perpanjangan.`,
  },
  {
    question: "Apakah ada fitur yang harus dibayar terpisah?",
    answer: `Tidak. Semua fitur modul sudah termasuk di Paket Lengkap, tanpa batas jumlah data dan tanpa paket bertingkat. Yang dibayar terpisah hanya hal yang memang menimbulkan biaya dan bisa diukur: penyimpanan arsip di atas ${INCLUDED_STORAGE_GB} GB, kredit Asisten Desa AI, GPS radius untuk absensi, dan template Website Desa.`,
  },
  {
    question: "Berapa perangkat desa yang bisa memakai absensi?",
    answer:
      "Paket Lengkap mencakup absensi QR untuk hingga 10 perangkat desa dengan riwayat 30 hari. Absensi GPS radius tersedia sebagai add-on terpisah.",
  },
  {
    question: "Bagaimana cara kerja kredit Asisten Desa AI?",
    answer: `Setiap pengguna mendapat ${AI_FREE_CREDITS.toLocaleString("id-ID")} kredit gratis. Satu pertanyaan memakai 1 kredit, dan kredit tidak dipotong bila jawaban gagal dibuat. Jika habis, kredit bisa diisi ulang mulai ${formatIdr(FIRST_AI_PACKAGE.price)} untuk ${FIRST_AI_PACKAGE.credits} kredit.`,
  },
  {
    question: "Bagaimana cara perpanjangan di tahun ke-2?",
    answer:
      "Perpanjangan dilakukan dari halaman Tagihan di aplikasi, dengan pilihan 1, 3, 6, atau 12 bulan. Sisa masa berlaku tidak hangus: perpanjangan disambung dari tanggal berakhir yang masih berjalan.",
  },
  {
    question: "Apakah tersedia trial?",
    answer:
      "Ya. Setiap desa baru mendapat trial gratis 14 hari tanpa perlu membayar di muka. Setelah trial, desa bisa membeli Paket Lengkap atau menghubungi tim kami untuk demo.",
  },
  {
    question: "Bagaimana dengan desa yang sudah memakai paket Starter, Profesional, atau Enterprise?",
    answer:
      "Tidak ada perubahan. Desa yang sudah aktif tetap memakai paket dan harganya masing-masing. Paket Lengkap berlaku untuk desa baru.",
  },
  {
    question: "Bagaimana cara pembayarannya?",
    answer:
      "Pembayaran melalui transfer bank atau metode yang tersedia di halaman Tagihan. Kami juga bisa membantu kebutuhan administrasi untuk pencairan APBDes.",
  },
  {
    question: "Apakah data desa kami aman?",
    answer:
      "Kami menerapkan praktik keamanan cloud standar: koneksi HTTPS, kontrol akses berbasis peran, cadangan berkala, serta jejak audit operasional. Kebutuhan compliance khusus dibahas bersama tim IT/wilayah Anda.",
  },
  {
    question: "Bagaimana dengan kabupaten atau kecamatan yang ingin memantau banyak desa?",
    answer:
      "Untuk pemantauan lintas desa dan dashboard akuntabilitas wilayah, hubungi tim kami. Skema lisensi kabupaten dibahas langsung sesuai jumlah desa dan kebutuhan.",
  },
];

export default function PricingPage() {
  const [showRegistration, setShowRegistration] = React.useState(false);
  const [showContact, setShowContact] = React.useState(false);
  const [showAllFeatures, setShowAllFeatures] = React.useState(false);
  const [openFaq, setOpenFaq] = React.useState<number | null>(null);

  const focusRing =
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d9488]";

  return (
    <>
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 opacity-30" aria-hidden="true">
          <div className="absolute top-20 left-10 w-96 h-96 bg-[#0d9488] rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute top-40 right-10 w-96 h-96 bg-[#6366f1] rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-20 left-1/2 w-96 h-96 bg-[#fbbf24] rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-[#0d9488]/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-[#0d9488]/20">
              <Building2 className="w-4 h-4 text-[#0d9488]" aria-hidden="true" />
              <span className="text-sm text-[#0d9488]">Satu Paket, Semua Fitur</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl text-gray-900 mb-6 leading-tight text-balance">
              Satu{" "}
              <span className="relative inline-block">
                Paket Lengkap
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  height="12"
                  viewBox="0 0 200 12"
                  fill="none"
                  aria-hidden="true"
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
              {formatIdr(LENGKAP.setupFee)} di awal, sudah termasuk tahun pertama.
              Mulai tahun ke-2 hanya {formatIdr(LENGKAP.monthlyFee)} per bulan.
              Semua fitur terbuka, tanpa paket bertingkat.
            </p>

            {/* Trust Badge */}
            <div className="inline-flex flex-wrap items-center justify-center gap-6 bg-white rounded-2xl px-8 py-4 shadow-lg border border-gray-200">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#0d9488]" aria-hidden="true" />
                <span className="text-sm text-gray-700">Trial gratis 14 hari</span>
              </div>
              <div className="w-px h-6 bg-gray-300 hidden sm:block"></div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#0d9488]" aria-hidden="true" />
                <span className="text-sm text-gray-700">Aplikasi untuk warga, RT, dan perangkat desa</span>
              </div>
              <div className="w-px h-6 bg-gray-300 hidden sm:block"></div>
              <div className="flex items-center gap-2">
                <HeadphonesIcon className="w-5 h-5 text-[#0d9488]" aria-hidden="true" />
                <span className="text-sm text-gray-700">Dukungan email & chat</span>
              </div>
            </div>
          </div>

          {/* Pricing Card */}
          <div className="relative max-w-5xl mx-auto bg-white rounded-3xl p-6 sm:p-10 shadow-2xl border-2 border-[#0d9488] ring-4 ring-[#0d9488]/10">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <div className="bg-linear-to-r from-[#0d9488] to-[#0f766e] text-white px-6 py-2 rounded-full text-sm shadow-lg flex items-center gap-2 whitespace-nowrap">
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                Untuk semua desa baru
              </div>
            </div>

            <div className="grid md:grid-cols-5 gap-8 md:gap-10">
              {/* Price column */}
              <div className="md:col-span-2 text-center md:text-left">
                <h2 className="text-2xl text-gray-900 mb-1">{LENGKAP.name}</h2>
                <p className="text-sm text-gray-600 mb-6">
                  Semua fitur Klandesa dalam satu langganan.
                </p>

                <p className="text-sm text-gray-600">Biaya awal</p>
                <p className="text-4xl sm:text-5xl text-gray-900 tabular-nums">
                  {formatIdr(LENGKAP.setupFee)}
                </p>
                <p className="text-sm text-[#0f766e] mt-1">
                  sudah termasuk 12 bulan pertama
                </p>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm text-gray-600">Mulai tahun ke-2</p>
                  <p className="text-2xl text-gray-900 tabular-nums">
                    {formatIdr(LENGKAP.monthlyFee)}
                    <span className="text-base text-gray-600"> / bulan</span>
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Perpanjang 1, 3, 6, atau 12 bulan. Sisa masa berlaku tidak hangus.
                  </p>
                </div>

                <div className="mt-8 flex flex-col gap-3">
                  <button
                    onClick={() => setShowRegistration(true)}
                    className={`w-full py-3 rounded-xl bg-linear-to-r from-[#0d9488] to-[#0f766e] text-white hover:shadow-xl transition-shadow flex items-center justify-center gap-2 group cursor-pointer ${focusRing}`}
                  >
                    <span>Mulai Trial Gratis 14 Hari</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform motion-reduce:transition-none" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => setShowContact(true)}
                    className={`w-full py-3 rounded-xl bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors cursor-pointer ${focusRing}`}
                  >
                    Jadwalkan Demo
                  </button>
                </div>
              </div>

              {/* Included column */}
              <div className="md:col-span-3 flex flex-col">
                <h3 className="text-lg text-gray-900 mb-4">Yang sudah termasuk</h3>
                <ul className="space-y-3.5">
                  {highlights.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-[#0d9488]/10 flex items-center justify-center mt-0.5">
                        <Check className="w-3 h-3 text-[#0d9488]" aria-hidden="true" />
                      </span>
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-gray-600 mt-4">
                  Serta absensi, arsip digital, dan dukungan, tanpa modul yang harus dibeli terpisah.
                </p>
                <button
                  onClick={() => setShowAllFeatures(true)}
                  className={`mt-6 self-start inline-flex items-center gap-2 text-[#0f766e] hover:text-[#0d9488] underline underline-offset-4 cursor-pointer ${focusRing}`}
                >
                  <span>Lihat semua fitur ({includedCount})</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metered extras Section */}
      <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-white border-y border-gray-100">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0d9488]">
              Tambahan sesuai pemakaian
            </p>
            <h2 className="text-3xl md:text-4xl text-gray-900 text-balance">
              Fitur tidak pernah dikunci. Bayar hanya untuk kapasitas.
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Tidak ada modul yang harus dibeli terpisah. Yang berbayar hanya hal
              yang memang menimbulkan biaya dan bisa diukur, dan semuanya opsional.
            </p>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
            {/* Storage */}
            <div className="rounded-2xl border border-gray-200 bg-linear-to-br from-gray-50 to-white p-6">
              <div className="w-12 h-12 rounded-xl bg-[#0d9488]/10 flex items-center justify-center mb-4">
                <HardDrive className="w-6 h-6 text-[#0d9488]" aria-hidden="true" />
              </div>
              <h3 className="text-lg text-gray-900 mb-1">Penyimpanan arsip</h3>
              <p className="text-sm text-gray-600 mb-4">
                {INCLUDED_STORAGE_GB} GB sudah termasuk. Tambah kapasitas bila arsip dan dokumen desa bertambah.
              </p>
              <ul className="divide-y divide-gray-200 text-sm">
                {storageTiers.map((tier) => (
                  <li key={tier.name} className="flex items-center justify-between py-2">
                    <span className="text-gray-700 tabular-nums">{tier.storageGb} GB</span>
                    <span className="text-gray-900 tabular-nums">
                      {formatIdr(tier.monthlyFee)}
                      <span className="text-gray-600"> / bulan</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* AI credits */}
            <div className="rounded-2xl border border-gray-200 bg-linear-to-br from-gray-50 to-white p-6">
              <div className="w-12 h-12 rounded-xl bg-[#0d9488]/10 flex items-center justify-center mb-4">
                <Bot className="w-6 h-6 text-[#0d9488]" aria-hidden="true" />
              </div>
              <h3 className="text-lg text-gray-900 mb-1">Kredit Asisten Desa AI</h3>
              <p className="text-sm text-gray-600 mb-4">
                Laras, asisten digital perangkat desa untuk SDGs, RPJMDes, program
                desa, dan layanan warga. Setiap pengguna mendapat{" "}
                {AI_FREE_CREDITS.toLocaleString("id-ID")} kredit gratis, 1 kredit
                untuk 1 pertanyaan.
              </p>
              <p className="text-gray-900 tabular-nums">
                <span className="text-sm text-gray-600">Isi ulang mulai </span>
                {formatIdr(FIRST_AI_PACKAGE.price)}
                <span className="text-sm text-gray-600">
                  {" "}
                  / {FIRST_AI_PACKAGE.credits} kredit
                </span>
              </p>
            </div>

            {/* Website */}
            <div className="rounded-2xl border border-gray-200 bg-linear-to-br from-gray-50 to-white p-6">
              <div className="w-12 h-12 rounded-xl bg-[#0d9488]/10 flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-[#0d9488]" aria-hidden="true" />
              </div>
              <h3 className="text-lg text-gray-900 mb-1">Website Desa</h3>
              <p className="text-sm text-gray-600">
                Website resmi desa dengan domain sendiri. Pilih template di menu
                Website; harga mengikuti template yang dipilih.
              </p>
            </div>

            {/* GPS */}
            <div className="rounded-2xl border border-gray-200 bg-linear-to-br from-gray-50 to-white p-6">
              <div className="w-12 h-12 rounded-xl bg-[#0d9488]/10 flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-[#0d9488]" aria-hidden="true" />
              </div>
              <h3 className="text-lg text-gray-900 mb-1">Absensi GPS radius</h3>
              <p className="text-sm text-gray-600 mb-4">
                Batasi absen perangkat desa hanya dalam radius lokasi kantor desa.
                Absensi QR sudah termasuk di paket.
              </p>
              <p className="text-gray-900 tabular-nums">
                {formatIdr(BILLING_CATALOG.absensi_gps_addon.monthlyFee)}
                <span className="text-sm text-gray-600"> / bulan</span>
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 flex gap-4">
              <div className="shrink-0 w-12 h-12 rounded-xl bg-[#0d9488]/10 flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-[#0d9488]" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg text-gray-900 mb-1">Sudah memakai paket lama?</h3>
                <p className="text-sm text-gray-600">
                  Desa yang sudah aktif di paket Starter, Profesional, atau
                  Enterprise tidak berubah. Paket dan harganya tetap berlaku.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 flex gap-4">
              <div className="shrink-0 w-12 h-12 rounded-xl bg-[#0d9488]/10 flex items-center justify-center">
                <Landmark className="w-6 h-6 text-[#0d9488]" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg text-gray-900 mb-1">Untuk kabupaten & kecamatan</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Pantau banyak desa dan akuntabilitas wilayah dari satu dashboard.
                  Skema lisensi dibahas sesuai jumlah desa.
                </p>
                <button
                  onClick={() => setShowContact(true)}
                  className={`text-sm text-[#0d9488] hover:text-[#0f766e] underline cursor-pointer ${focusRing}`}
                >
                  Hubungi tim kami
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-linear-to-br from-gray-50 to-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-[#0d9488]/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-[#0d9488]/20">
              <HelpCircle className="w-4 h-4 text-[#0d9488]" aria-hidden="true" />
              <span className="text-sm text-[#0d9488]">FAQ</span>
            </div>

            <h2 className="text-3xl md:text-4xl text-gray-900 mb-4">
              Pertanyaan yang Sering Diajukan
            </h2>
            <p className="text-lg text-gray-600">
              Temukan jawaban untuk pertanyaan umum tentang harga dan layanan kami
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={faq.question}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-[#0d9488]/30 transition-colors"
              >
                <h3>
                  <button
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    aria-expanded={openFaq === index}
                    aria-controls={`faq-panel-${index}`}
                    className={`w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors cursor-pointer ${focusRing}`}
                  >
                    <span className="text-gray-900 pr-4">{faq.question}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-500 shrink-0 transition-transform motion-reduce:transition-none ${
                        openFaq === index ? "rotate-180" : ""
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                </h3>

                {openFaq === index && (
                  <div
                    id={`faq-panel-${index}`}
                    className="px-6 pb-5 animate-in slide-in-from-top-2 duration-200"
                  >
                    <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-4">Masih punya pertanyaan?</p>
            <button
              onClick={() => setShowContact(true)}
              className={`inline-flex items-center gap-2 bg-linear-to-r from-[#0d9488] to-[#0f766e] text-white px-8 py-3 rounded-xl hover:shadow-xl transition-shadow group cursor-pointer ${focusRing}`}
            >
              <span>Hubungi Tim Kami</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform motion-reduce:transition-none" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-linear-to-br from-[#0d9488] via-[#0f766e] to-[#0d9488] overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 opacity-10" aria-hidden="true">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-blob"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#fbbf24] rounded-full mix-blend-overlay filter blur-3xl animate-blob animation-delay-2000"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-3xl md:text-4xl text-white mb-6">
            Siap Memulai Transformasi Digital?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Coba gratis 14 hari. Jika cocok, {formatIdr(LENGKAP.setupFee)} sudah
            mencakup semua fitur dan tahun pertama desa Anda.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setShowRegistration(true)}
              className="bg-white text-[#0d9488] px-8 py-4 rounded-xl hover:shadow-2xl transition-shadow flex items-center justify-center gap-2 group cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <span>Daftar Sekarang</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform motion-reduce:transition-none" aria-hidden="true" />
            </button>

            <button
              onClick={() => setShowContact(true)}
              className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-xl hover:bg-white/10 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Jadwalkan Demo
            </button>
          </div>

          <p className="mt-6 text-white/80 text-sm">
            Trial gratis • Demo langsung • Harga transparan
          </p>
        </div>
      </section>

      <Dialog open={showAllFeatures} onOpenChange={setShowAllFeatures}>
        <DialogContent className="bg-white text-gray-900 sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl leading-snug">
              Semua fitur Paket Lengkap
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Semuanya sudah termasuk dalam {formatIdr(LENGKAP.setupFee)}, tanpa
              modul yang harus dibeli terpisah.
            </DialogDescription>
          </DialogHeader>

          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6 pt-2">
            {includedGroups.map((group) => (
              <div key={group.title}>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  {group.title}
                </h4>
                <ul className="space-y-2">
                  {group.items.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-[#0d9488]/10 flex items-center justify-center mt-0.5">
                        <Check className="w-3 h-3 text-[#0d9488]" aria-hidden="true" />
                      </span>
                      <span className="text-sm text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {showRegistration && (
        <RegistrationModal onClose={() => setShowRegistration(false)} />
      )}
      {showContact && <ContactModal onClose={() => setShowContact(false)} />}
    </>
  );
}
