import React from "react";
import {
  CheckCircle,
  Clock,
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Send,
  User,
  X,
} from "lucide-react";

import { KlandesaLogo } from "./KlandesaLogo";
import { getStoredReferralCode } from "@/lib/referrals/client";
import { TurnstileWidget } from "@/components/security/TurnstileWidget";
import { isTurnstileRequiredOnClient } from "@/lib/turnstile-config";

interface ContactModalProps {
  onClose: () => void;
}

const socialMedia = [
  {
    icon: Facebook,
    href: "https://www.facebook.com/klandesacom",
    label: "Facebook",
  },
  {
    icon: Instagram,
    href: "https://www.instagram.com/klandesa/",
    label: "Instagram",
  },
  {
    icon: Linkedin,
    href: "https://www.linkedin.com/company/klandesa",
    label: "LinkedIn",
  },
] as const;

export function ContactModal({ onClose }: ContactModalProps) {
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = React.useState<string | null>(null);
  const turnstileRequired = isTurnstileRequiredOnClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setSubmitError(null);

      if (turnstileRequired && !turnstileToken) {
        throw new Error("Selesaikan verifikasi keamanan terlebih dahulu");
      }

      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          turnstileToken,
          referralCode: getStoredReferralCode(),
          sourcePath:
            typeof window === "undefined"
              ? "/"
              : `${window.location.pathname}${window.location.search}`,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        throw new Error(data?.error || "Gagal mengirim pesan");
      }

      setIsSubmitted(true);

      setTimeout(() => {
        setIsSubmitted(false);
        onClose();
      }, 3000);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Gagal mengirim pesan",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const contactInfo = [
    {
      icon: Phone,
      title: "Telepon",
      info: "+62 823-2033-7777",
      description: "Senin - Jumat, 08:00 - 17:00 WIB",
    },
    {
      icon: Mail,
      title: "Email",
      info: "info@klandesa.com",
      description: "Respon dalam 24 jam",
    },
    {
      icon: MapPin,
      title: "Alamat",
      info: "Jakarta, Indonesia",
      description: "Kunjungi kantor kami",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-100 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <button
          type="button"
          aria-label="Tutup"
          className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300 fill-mode-forwards"
          onClick={onClose}
        />
        <div className="relative z-10 w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 fill-mode-forwards my-8 max-h-[90vh] overflow-y-auto">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition-all hover:scale-110 shadow-lg"
            aria-label="Close"
          >
            <X className="w-6 h-6 text-gray-700" />
          </button>

          <div className="grid md:grid-cols-2">
            {/* Left Side - Contact Info */}
            <div className="relative bg-linear-to-br from-[#0d9488] via-[#0f766e] to-[#0d9488] p-8 md:p-12 overflow-hidden">
              {/* Animated Background Elements */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-blob"></div>
                <div className="absolute bottom-10 right-10 w-64 h-64 bg-[#6366f1] rounded-full mix-blend-overlay filter blur-3xl animate-blob animation-delay-2000"></div>
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

              <div className="relative z-10 h-full flex flex-col">
                {/* Header */}
                <div className="mb-8">
                  <div className="inline-flex items-center gap-3 mb-4">
                    <KlandesaLogo
                      // className="w-12 h-12"
                      // showText={false}
                      variant="white"
                    />
                  </div>
                  <h2 className="text-3xl text-white">Hubungi Kami</h2>
                  <p className="text-white/90 text-lg mt-2">
                    Kami siap membantu Anda dengan pertanyaan atau kebutuhan
                    apapun
                  </p>
                </div>

                {/* Contact Cards */}
                <div className="space-y-6 grow">
                  {contactInfo.map((item, index) => (
                    <div
                      key={index}
                      className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 group"
                    >
                      <div className="flex items-start gap-4">
                        <div className="bg-white/20 p-3 rounded-xl group-hover:scale-110 transition-transform shrink-0">
                          <item.icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="grow">
                          <h3 className="text-white mb-1">{item.title}</h3>
                          <p className="text-white text-lg mb-1">{item.info}</p>
                          <p className="text-white/70 text-sm">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Working Hours */}
                <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <div className="flex items-center gap-3 mb-3">
                    <Clock className="w-5 h-5 text-white" />
                    <h3 className="text-white">Jam Operasional</h3>
                  </div>
                  <div className="space-y-2 text-white/80 text-sm">
                    <div className="flex justify-between">
                      <span>Senin - Jumat</span>
                      <span>08:00 - 17:00 WIB</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sabtu</span>
                      <span>08:00 - 12:00 WIB</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Minggu</span>
                      <span className="text-white/60">Tutup</span>
                    </div>
                  </div>
                </div>

                {/* Social Media */}
                <div className="mt-6">
                  <p className="text-white/80 text-sm mb-3">Ikuti Kami</p>
                  <div className="flex gap-3">
                    {socialMedia.map((social) => {
                      const Icon = social.icon;
                      return (
                        <a
                          key={social.label}
                          href={social.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={social.label}
                          className="bg-white/10 backdrop-blur-sm p-3 rounded-xl hover:bg-white/20 transition-all hover:scale-110 border border-white/20"
                        >
                          <Icon className="h-5 w-5 text-white" aria-hidden />
                        </a>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Contact Form */}
            <div className="p-8 md:p-12 flex flex-col justify-center relative z-10 bg-white">
              {!isSubmitted ? (
                <div className="max-w-md mx-auto w-full">
                  <div className="mb-6">
                    <h3
                      id="contact-modal-title"
                      className="text-2xl text-gray-900 mb-2"
                    >
                      Kirim Pesan
                    </h3>
                    <p className="text-gray-600">
                      Isi formulir di bawah dan kami akan segera menghubungi
                      Anda
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Name */}
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm text-gray-700 mb-2"
                      >
                        Nama Lengkap <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <User className="w-5 h-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          id="name"
                          value={formData.name}
                          onChange={(e) =>
                            handleInputChange("name", e.target.value)
                          }
                          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition-all outline-none bg-gray-50 focus:bg-white"
                          placeholder="Masukkan nama Anda"
                          required
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm text-gray-700 mb-2"
                      >
                        Email <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Mail className="w-5 h-5 text-gray-400" />
                        </div>
                        <input
                          type="email"
                          id="email"
                          value={formData.email}
                          onChange={(e) =>
                            handleInputChange("email", e.target.value)
                          }
                          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition-all outline-none bg-gray-50 focus:bg-white"
                          placeholder="nama@email.com"
                          required
                        />
                      </div>
                    </div>

                    {/* Phone */}
                    <div>
                      <label
                        htmlFor="phone"
                        className="block text-sm text-gray-700 mb-2"
                      >
                        Nomor Telepon
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Phone className="w-5 h-5 text-gray-400" />
                        </div>
                        <input
                          type="tel"
                          id="phone"
                          value={formData.phone}
                          onChange={(e) =>
                            handleInputChange("phone", e.target.value)
                          }
                          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition-all outline-none bg-gray-50 focus:bg-white"
                          placeholder="08xxxxxxxxxx"
                        />
                      </div>
                    </div>

                    {/* Subject */}
                    <div>
                      <label
                        htmlFor="subject"
                        className="block text-sm text-gray-700 mb-2"
                      >
                        Subjek <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="subject"
                        value={formData.subject}
                        onChange={(e) =>
                          handleInputChange("subject", e.target.value)
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition-all outline-none bg-gray-50 focus:bg-white appearance-none"
                        required
                      >
                        <option value="">Pilih subjek</option>
                        <option value="pendaftaran">
                          Informasi Pendaftaran
                        </option>
                        <option value="layanan">Pertanyaan Layanan</option>
                        <option value="teknis">Bantuan Teknis</option>
                        <option value="kerjasama">Kerjasama</option>
                        <option value="lainnya">Lainnya</option>
                      </select>
                    </div>

                    {/* Message */}
                    <div>
                      <label
                        htmlFor="message"
                        className="block text-sm text-gray-700 mb-2"
                      >
                        Pesan <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        id="message"
                        value={formData.message}
                        onChange={(e) =>
                          handleInputChange("message", e.target.value)
                        }
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition-all outline-none bg-gray-50 focus:bg-white resize-none"
                        placeholder="Tulis pesan Anda di sini..."
                        required
                      ></textarea>
                    </div>

                    <TurnstileWidget className="pt-1" onToken={setTurnstileToken} />

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={
                        isSubmitting ||
                        (turnstileRequired && !turnstileToken)
                      }
                      className="w-full bg-linear-to-r from-[#0d9488] to-[#0f766e] text-white py-3.5 rounded-xl hover:shadow-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2 group"
                    >
                      <span>
                        {isSubmitting ? "Mengirim..." : "Kirim Pesan"}
                      </span>
                      <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </form>

                  {submitError && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl">
                      <p className="text-sm text-red-800">{submitError}</p>
                    </div>
                  )}

                  {/* Additional Info */}
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                    <p className="text-sm text-blue-900">
                      <strong>Catatan:</strong> Kami akan merespon pesan Anda
                      dalam waktu maksimal 1x24 jam pada hari kerja.
                    </p>
                  </div>
                </div>
              ) : (
                // Success Message
                <div className="max-w-md mx-auto w-full text-center animate-in zoom-in-95 duration-300">
                  <div className="mb-6">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                      <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <h3 className="text-2xl text-gray-900 mb-2">
                      Pesan Terkirim!
                    </h3>
                    <p className="text-gray-600">
                      Terima kasih telah menghubungi kami. Tim kami akan segera
                      merespon pesan Anda.
                    </p>
                  </div>
                  <div className="bg-green-50 border border-green-100 rounded-xl p-6">
                    <div className="space-y-2 text-sm text-gray-700">
                      <p>
                        <strong>Nama:</strong> {formData.name}
                      </p>
                      <p>
                        <strong>Email:</strong> {formData.email}
                      </p>
                      <p>
                        <strong>Subjek:</strong> {formData.subject}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
