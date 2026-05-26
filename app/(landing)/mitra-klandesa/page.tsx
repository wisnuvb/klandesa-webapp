"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Eye,
  EyeOff,
  Handshake,
  Lock,
  MapPin,
  MessageSquare,
  Send,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

const benefits = [
  {
    icon: TrendingUp,
    title: "Komisi per closing",
    description:
      "Bagikan reward yang transparan setiap kesepakatan desa berhasil ditutup melalui referensi Anda.",
  },
  {
    icon: Sparkles,
    title: "Materi & dukungan tim",
    description:
      "Akses deck produk, demo, dan panduan singkat agar percakapan dengan calon mitra desa lebih mudah.",
  },
  {
    icon: MapPin,
    title: "Fokus wilayah Anda",
    description:
      "Bangun relasi di zona yang Anda kuasai—kami membantu menyelaraskan ekspektasi dan proses kontrak.",
  },
  {
    icon: Users,
    title: "Partner, bukan karyawan",
    description:
      "Fleksibel: cocok untuk konsultan desa, relasi pemda, atau komunitas yang memperkenalkan Klandesa.",
  },
];

const steps = [
  {
    step: "1",
    title: "Daftar",
    text: "Isi formulir lengkap dengan password untuk akses portal mitra — tim akan menghubungi Anda.",
  },
  {
    step: "2",
    title: "Diskusi",
    text: "Tim kami menghubungi untuk menjelaskan skema komisi dan ekspektasi mitra.",
  },
  {
    step: "3",
    title: "Aktif",
    text: "Setelah cocok, Anda mendapat materi dukungan dan acuan proses closing.",
  },
  {
    step: "4",
    title: "Closing",
    text: "Setiap desa yang deal lewat jalur Anda memicu bagi hasil sesuai kesepakatan.",
  },
];

const faqs = [
  {
    q: "Apakah ini lowongan pegawai tetap?",
    a: "Bukan. Ini program kemitraan dengan bagi hasil per closing, cocok untuk yang sudah punya jaringan di dunia desa/pemdes.",
  },
  {
    q: "Bagaimana besaran komisi?",
    a: "Detail komisi dibahas saat diskusi awal agar sesuai jenis deal dan wilayah. Isi formulir agar tim kami bisa menjelaskan lebih rinci.",
  },
  {
    q: "Harus punya PT/CV?",
    a: "Tidak wajib di tahap awal; kami akan cek kesesuaian saat follow-up. Yang penting kontak dan motivasi jelas di formulir.",
  },
];

export default function MitraPage() {
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    phone: "",
    region: "",
    message: "",
    password: "",
    confirmPassword: "",
    website: "",
  });
  const [showPw, setShowPw] = React.useState(false);
  const [showPw2, setShowPw2] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (formData.password !== formData.confirmPassword) {
      setSubmitError("Konfirmasi password tidak sama.");
      return;
    }
    try {
      setIsSubmitting(true);

      const res = await fetch("/api/partner-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          region: formData.region,
          message: formData.message,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          website: formData.website,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error || "Gagal mengirim pendaftaran");
      }

      setIsSubmitted(true);
      setFormData({
        name: "",
        email: "",
        phone: "",
        region: "",
        message: "",
        password: "",
        confirmPassword: "",
        website: "",
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Gagal mengirim pendaftaran");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
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
              backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
              backgroundSize: "30px 30px",
            }}
          />
        </div>

        <div className="relative z-10 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-white/30">
            <Handshake className="w-4 h-4 text-[#fbbf24]" />
            <span className="text-white text-sm">Program mitra Klandesa</span>
          </div>

          <h1 className="text-4xl md:text-5xl text-white mb-4 font-semibold tracking-tight">
            Jadi mitra, bagi komisi tiap closing
          </h1>
          <p className="text-white/90 text-lg md:text-xl max-w-2xl mx-auto mb-8">
            Bantu desa kenal Klandesa, dan dapatkan bagi hasil yang jelas setiap kesepakatan
            selesai.
          </p>
          <a
            href="#daftar-mitra"
            className="inline-flex items-center gap-2 bg-white text-[#0d9488] px-8 py-3.5 rounded-xl font-medium hover:shadow-xl transition-all hover:scale-105"
          >
            Daftar sebagai mitra
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-12 md:py-16 max-w-7xl mx-auto -mt-3 relative z-10">
        <div className="rounded-2xl border border-[#0d9488]/25 bg-emerald-50/80 backdrop-blur-sm p-8 md:p-10 mb-12 shadow-sm">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4">
            Jual paket lengkap, bukan fitur satuan
          </h2>
          <p className="text-gray-700 leading-relaxed mb-6">
            Klandesa adalah <strong className="font-semibold text-gray-900">platform operasional desa berbasis SDGs</strong>
            —dari data warga, surat daring, APBDes bertanda tujuan pembangunan, hingga unduhan format Kemendesa.
            Pemda dan konsultan wilayah bisa menyusun kombinasi fitur (peta, PKK, BUMDes, AI) dengan paket Starter,
            Profesional, atau Enterprise yang transparan untuk bagi hasil mitra Anda.
          </p>
          <Link
            href="/platform"
            className="inline-flex items-center gap-2 text-[#0d9488] font-semibold underline-offset-4 hover:underline"
          >
            Lihat daftar fitur
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {benefits.map((item) => (
            <div
              key={item.title}
              className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-[#0d9488] transition-all duration-300 hover:shadow-xl"
            >
              <div className="inline-flex p-4 rounded-xl bg-linear-to-br from-[#0d9488] to-[#0f766e] mb-4">
                <item.icon className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl text-gray-900 mb-2">{item.title}</h2>
              <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="bg-linear-to-br from-gray-50 to-gray-100 rounded-2xl p-8 md:p-10 border border-gray-200 mb-16">
          <div className="flex items-center gap-3 justify-center mb-8">
            <Briefcase className="w-8 h-8 text-[#0d9488]" />
            <h2 className="text-2xl md:text-3xl text-gray-900 font-semibold">
              Cara kerja singkat
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s) => (
              <div
                key={s.step}
                className="bg-white rounded-xl p-5 border border-gray-200 hover:border-[#0d9488]/50 transition-colors"
              >
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#0d9488] text-white text-sm font-semibold mb-3">
                  {s.step}
                </span>
                <h3 className="text-lg text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-2xl md:text-3xl text-gray-900 font-semibold text-center mb-8">
            Pertanyaan yang sering diajukan
          </h2>
          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((f) => (
              <div className="bg-white rounded-xl border border-gray-200 p-5" key={f.q}>
                <div className="flex gap-3">
                  <MessageSquare className="w-5 h-5 text-[#0d9488] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-gray-900 font-medium mb-2">{f.q}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{f.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          id="daftar-mitra"
          className="scroll-mt-24 bg-white rounded-2xl border border-gray-200 p-6 md:p-10 shadow-sm w-fit mx-auto"
        >
          <div className="max-w-xl mx-auto">
            <h2 className="text-2xl font-semibold text-gray-900 text-center mb-2">
              Formulir pendaftaran mitra
            </h2>
            <p className="text-sm text-gray-600 text-center mb-8">
              Data dikirim ke sistem kami secara aman; tim akan menghubungi Anda melalui kontak
              yang Anda cantumkan.
            </p>

            {isSubmitted ? (
              <div className="rounded-xl border border-[#0d9488]/30 bg-[#0d9488]/5 p-6 text-center">
                <CheckCircle2 className="w-12 h-12 text-[#0d9488] mx-auto mb-3" />
                <p className="text-gray-900 font-medium mb-1">Terima kasih</p>
                <p className="text-sm text-gray-600 mb-4">
                  Pendaftaran sudah kami terima. Tim akan menghubungi Anda melalui kontak yang
                  Anda berikan.
                </p>
                <button
                  type="button"
                  onClick={() => setIsSubmitted(false)}
                  className="text-sm text-[#0d9488] font-medium hover:underline"
                >
                  Kirim pendaftaran lain
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden
                  className="fixed left-full top-0 w-px h-px opacity-0 pointer-events-none"
                  value={formData.website}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, website: e.target.value }))
                  }
                />

                <div>
                  <label
                    htmlFor="partner-name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Nama lengkap
                  </label>
                  <input
                    id="partner-name"
                    type="text"
                    required
                    maxLength={120}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#0d9488]/30 focus:border-[#0d9488] outline-none text-gray-900"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label
                    htmlFor="partner-email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email
                  </label>
                  <input
                    id="partner-email"
                    type="email"
                    required
                    maxLength={254}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#0d9488]/30 focus:border-[#0d9488] outline-none text-gray-900"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, email: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label
                    htmlFor="partner-phone"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Nomor HP (WhatsApp)
                  </label>
                  <input
                    id="partner-phone"
                    type="tel"
                    required
                    maxLength={40}
                    autoComplete="tel"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#0d9488]/30 focus:border-[#0d9488] outline-none text-gray-900"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, phone: e.target.value }))
                    }
                  />
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                    <Lock className="w-4 h-4 shrink-0 text-[#0d9488]" />
                    Password akun portal mitra
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Setelah pendaftaran disetujui admin, Anda login ke{" "}
                    <span className="font-medium">portal mitra</span> dengan email dan password ini.
                    Minimal 8 karakter.
                  </p>
                  <div>
                    <label
                      htmlFor="partner-password"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="partner-password"
                        type={showPw ? "text" : "password"}
                        required
                        minLength={8}
                        maxLength={128}
                        autoComplete="new-password"
                        aria-describedby="partner-password-hint"
                        className="w-full pl-4 pr-12 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#0d9488]/30 focus:border-[#0d9488] outline-none text-gray-900"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            password: e.target.value,
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]"
                        onClick={() => setShowPw((v) => !v)}
                        aria-label={showPw ? "Sembunyikan password" : "Tampilkan password"}
                      >
                        {showPw ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    <p id="partner-password-hint" className="sr-only">
                      Minimal 8 karakter, maksimal 128 karakter
                    </p>
                  </div>
                  <div>
                    <label
                      htmlFor="partner-password-confirm"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Konfirmasi password
                    </label>
                    <div className="relative">
                      <input
                        id="partner-password-confirm"
                        type={showPw2 ? "text" : "password"}
                        required
                        minLength={8}
                        maxLength={128}
                        autoComplete="new-password"
                        className="w-full pl-4 pr-12 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#0d9488]/30 focus:border-[#0d9488] outline-none text-gray-900"
                        value={formData.confirmPassword}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            confirmPassword: e.target.value,
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]"
                        onClick={() => setShowPw2((v) => !v)}
                        aria-label={showPw2 ? "Sembunyikan konfirmasi" : "Tampilkan konfirmasi"}
                      >
                        {showPw2 ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="partner-region"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Kota / wilayah cakupan
                  </label>
                  <input
                    id="partner-region"
                    type="text"
                    required
                    maxLength={200}
                    placeholder="Contoh: Kab. Sleman, DIY"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#0d9488]/30 focus:border-[#0d9488] outline-none text-gray-900 placeholder:text-gray-400"
                    value={formData.region}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, region: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label
                    htmlFor="partner-message"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Cerita singkat / pengalaman relevan
                  </label>
                  <textarea
                    id="partner-message"
                    required
                    rows={4}
                    maxLength={2000}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#0d9488]/30 focus:border-[#0d9488] outline-none text-gray-900 resize-y min-h-[100px]"
                    value={formData.message}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, message: e.target.value }))
                    }
                  />
                </div>

                {submitError ? (
                  <p className="text-sm text-red-600" role="alert">
                    {submitError}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 bg-linear-to-r from-[#0d9488] to-[#0f766e] text-white py-3.5 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    "Mengirim…"
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Kirim pendaftaran
                    </>
                  )}
                </button>
              </form>
            )}

            <p className="text-xs text-gray-500 text-center mt-6">
              Ada pertanyaan lain?{" "}
              <Link href="/harga" className="text-[#0d9488] hover:underline">
                Lihat paket
              </Link>
              {" · "}
              <Link href="/karir" className="text-[#0d9488] hover:underline">
                Karir
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
