import type { Metadata } from "next";
import { ArrowRight, FileText, Landmark, ShieldCheck, Smartphone, Users } from "lucide-react";
import {
  ADS_BENEFITS,
  ADS_FORM_ID,
  ADS_PRICE,
  ADS_STEPS,
} from "@/lib/marketing/ads-landing";
import { LeadForm } from "./_components/LeadForm";
import { StickyBar, TrialButton, ViewContentTracker, WhatsAppLink } from "./_components/Actions";

/**
 * Halaman tujuan iklan Meta. Sengaja noindex dan tidak masuk sitemap: untuk lalu lintas iklan, bukan SEO.
 * Panduan lengkap: docs/ADS_META.md
 */
export const metadata: Metadata = {
  title: { absolute: "Aplikasi Desa Digital — Coba Gratis 14 Hari | Klandesa" },
  description:
    "Surat online, data warga, APB Desa, dan Dana Desa dalam satu aplikasi. Coba Klandesa gratis 14 hari atau minta tim kami menghubungi Anda.",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

const ICONS = {
  surat: FileText,
  warga: Users,
  keuangan: Landmark,
  seluler: Smartphone,
} as const;

const btnPrimary =
  "inline-flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-6 text-lg font-semibold text-[#0f766e] transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/60";
const btnOnDark =
  "inline-flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-white/70 px-6 text-lg font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/60";

export default function DesaDigitalAdsPage() {
  return (
    <main className="pb-24 lg:pb-0">
      <ViewContentTracker />

      {/* Hero */}
      <section className="bg-linear-to-br from-[#115e59] to-[#0f766e] text-white">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="text-sm font-medium text-teal-100">Untuk kepala desa dan perangkat desa</p>
          <h1 className="mt-3 max-w-3xl text-balance text-3xl font-bold leading-tight sm:text-5xl">
            Surat, data warga, dan keuangan desa dalam satu aplikasi
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-teal-50">
            Klandesa membantu perangkat desa mengurus administrasi harian lebih rapi. Coba gratis {ADS_PRICE.trialDays} hari
            untuk desa Anda.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href={`#${ADS_FORM_ID}`} className={btnPrimary}>
              Minta dihubungi
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </a>
            <WhatsAppLink location="hero" className={btnOnDark}>
              Chat WhatsApp
            </WhatsAppLink>
          </div>
          <ul className="mt-8 flex flex-col gap-2 text-base text-teal-50 sm:flex-row sm:flex-wrap sm:gap-x-8">
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
              Trial gratis {ADS_PRICE.trialDays} hari
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
              Harga transparan, tanpa paket bertingkat
            </li>
          </ul>
        </div>
      </section>

      {/* Manfaat */}
      <section aria-labelledby="manfaat" className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <h2 id="manfaat" className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Yang bisa Anda kerjakan dengan Klandesa
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {ADS_BENEFITS.map((b) => {
            const Icon = ICONS[b.icon];
            return (
              <li key={b.title} className="flex gap-4 rounded-2xl border border-gray-200 bg-white p-5">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-[#0f766e]">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{b.title}</h3>
                  <p className="mt-1 text-base leading-relaxed text-gray-700">{b.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Harga */}
      <section aria-labelledby="harga" className="bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 id="harga" className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Harga jelas dari awal
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border-2 border-[#0f766e] bg-white p-6">
              <p className="text-base text-gray-700">Biaya awal</p>
              <p className="mt-1 text-4xl font-bold tabular-nums text-gray-900">{ADS_PRICE.setup}</p>
              <p className="mt-2 text-base font-medium text-[#0f766e]">Sudah termasuk 12 bulan pertama</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <p className="text-base text-gray-700">Mulai tahun ke-2</p>
              <p className="mt-1 text-4xl font-bold tabular-nums text-gray-900">
                {ADS_PRICE.monthly}
                <span className="text-lg font-normal text-gray-700"> / bulan</span>
              </p>
              <p className="mt-2 text-base text-gray-700">Semua fitur terbuka, tanpa paket bertingkat.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Langkah */}
      <section aria-labelledby="langkah" className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <h2 id="langkah" className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Cara memulai
        </h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-3">
          {ADS_STEPS.map((s, i) => (
            <li key={s.title} className="rounded-2xl border border-gray-200 bg-white p-5">
              <span
                aria-hidden="true"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0f766e] text-base font-bold text-white"
              >
                {i + 1}
              </span>
              <h3 className="mt-3 text-lg font-semibold text-gray-900">{s.title}</h3>
              <p className="mt-1 text-base leading-relaxed text-gray-700">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Formulir */}
      <section aria-labelledby="form-judul" className="bg-teal-50">
        <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 id="form-judul" className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Minta tim Klandesa menghubungi Anda
          </h2>
          <p className="mt-2 text-base leading-relaxed text-gray-700">
            Isi tiga kolom ini. Kami menghubungi lewat WhatsApp pada jam kerja.
          </p>
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <LeadForm />
          </div>
          <div className="mt-6 flex flex-col items-stretch gap-3 text-center">
            <WhatsAppLink
              location="formulir"
              className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-[#0f766e] bg-white px-5 text-base font-semibold text-[#0f766e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0d9488]/40"
            >
              Lebih suka chat langsung? Buka WhatsApp
            </WhatsAppLink>
            <p className="text-base text-gray-700">
              Mau mencoba sendiri?{" "}
              <TrialButton className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-[#0f766e] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0d9488]/40">
                Daftar trial gratis {ADS_PRICE.trialDays} hari
              </TrialButton>
            </p>
          </div>
        </div>
      </section>

      <StickyBar />
    </main>
  );
}
