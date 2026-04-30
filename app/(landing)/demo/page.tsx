"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileText,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const demoCredentials = {
  email: "demo@klandesa.com",
  password: "123456",
};

const quickStartSteps = [
  {
    title: "Buka halaman login",
    description:
      "Masuk ke portal Klandesa untuk mulai simulasi alur kerja layanan desa.",
  },
  {
    title: "Masukkan akun demo",
    description:
      "Gunakan email dan password demo yang tersedia di bawah untuk akses cepat.",
  },
  {
    title: "Eksplor menu utama",
    description:
      "Coba alur administrasi, pantau data, dan lihat bagaimana layanan warga diproses end-to-end.",
  },
];

const highlights = [
  {
    icon: ClipboardList,
    title: "Administrasi Lebih Tertata",
    description:
      "Dokumen, proses layanan, dan data operasional desa tersusun dalam satu sistem kerja yang konsisten.",
  },
  {
    icon: ShieldCheck,
    title: "Transparansi Proses",
    description:
      "Setiap langkah layanan lebih mudah dipantau sehingga progres kerja perangkat desa terlihat jelas.",
  },
  {
    icon: FileText,
    title: "Pelayanan Warga Lebih Cepat",
    description:
      "Alur pengajuan dan verifikasi surat dirancang agar respons pelayanan terasa lebih efisien.",
  },
];

export default function DemoPage() {
  return (
    <main className="pt-28 pb-20 px-4 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-3xl border border-[#0d9488]/20 bg-gradient-to-br from-[#0d9488] via-[#0f766e] to-[#115e59] px-6 py-14 sm:px-10 lg:px-14">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-20 -left-16 h-72 w-72 rounded-full bg-white blur-3xl" />
          <div className="absolute -bottom-20 right-8 h-64 w-64 rounded-full bg-[#fbbf24] blur-3xl" />
        </div>

        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-2 text-sm text-white backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-[#fbbf24]" />
              Demo Klandesa Siap Dicoba
            </div>

            <h1 className="mt-6 text-3xl text-white sm:text-4xl lg:text-5xl">
              Coba Klandesa Demo
            </h1>
            <p className="mt-4 max-w-2xl text-base text-white/90 sm:text-lg">
              Rasakan simulasi alur kerja layanan desa dalam satu dashboard.
              Halaman ini membantu tim Anda menilai bagaimana Klandesa
              mendukung administrasi, transparansi data, dan pelayanan warga.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm text-[#0f766e] transition hover:bg-gray-100"
              >
                Masuk ke Demo
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/fitur"
                className="inline-flex items-center rounded-xl border border-white/30 px-5 py-3 text-sm text-white transition hover:bg-white/10"
              >
                Lihat Ringkasan Fitur
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-white/25 bg-white/95 p-6 shadow-xl backdrop-blur-sm sm:p-8">
            <div className="flex items-center gap-2 text-[#0f766e]">
              <KeyRound className="h-5 w-5" />
              <p className="text-sm">Akun Demo Aktif</p>
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-1 flex items-center gap-2 text-xs text-gray-500">
                  <Mail className="h-4 w-4" />
                  Email
                </div>
                <p className="font-mono text-sm text-gray-900">
                  {demoCredentials.email}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-1 flex items-center gap-2 text-xs text-gray-500">
                  <Lock className="h-4 w-4" />
                  Password
                </div>
                <p className="font-mono text-sm text-gray-900">
                  {demoCredentials.password}
                </p>
              </div>
            </div>

            <p className="mt-5 text-xs leading-relaxed text-gray-600">
              Kredensial ini disediakan untuk eksplorasi sistem. Data di akun
              demo bersifat simulasi agar Anda bisa mencoba alur tanpa
              memengaruhi data produksi.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-14 max-w-6xl">
        <div className="text-center">
          <h2 className="text-2xl text-gray-900 sm:text-3xl">
            Mulai dalam 3 Langkah Cepat
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-600 sm:text-base">
            Alur ini dirancang supaya tim desa bisa langsung memahami proses
            inti tanpa setup yang rumit.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {quickStartSteps.map((step, index) => (
            <div
              key={step.title}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#0d9488]/10 text-sm text-[#0f766e]">
                {index + 1}
              </div>
              <h3 className="text-lg text-gray-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-14 max-w-6xl">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-10">
          <h2 className="text-2xl text-gray-900 sm:text-3xl">
            Yang Bisa Anda Nilai dari Demo Ini
          </h2>
          <p className="mt-3 max-w-3xl text-sm text-gray-600 sm:text-base">
            Fokuskan evaluasi pada kecocokan sistem dengan kebutuhan operasional
            desa sehari-hari, terutama dari sisi layanan, pengelolaan data, dan
            koordinasi kerja tim.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {highlights.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-5"
                >
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#0d9488]/10 text-[#0f766e]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg text-gray-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 rounded-2xl border border-[#0d9488]/20 bg-[#f0fdfa] p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#0f766e]" />
              <p className="text-sm leading-relaxed text-gray-700">
                Setelah mencoba demo, Anda bisa lanjut diskusi dengan tim
                Klandesa untuk menyesuaikan implementasi sesuai kebutuhan
                layanan di desa Anda.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
