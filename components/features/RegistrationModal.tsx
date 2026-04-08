import React from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  Users,
  X,
} from "lucide-react";

import { KlandesaLogo } from "./KlandesaLogo";

interface RegistrationModalProps {
  onClose: () => void;
}

export function RegistrationModal({ onClose }: RegistrationModalProps) {
  const [step, setStep] = React.useState(1);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  // Form data
  const [formData, setFormData] = React.useState({
    // Step 1: Informasi Desa
    namaKabupaten: "",
    namaKecamatan: "",
    namaDesa: "",
    provinsi: "",

    // Step 2: Kontak & Penanggung Jawab
    namaKepala: "",
    nomorTelepon: "",
    emailDesa: "",

    // Step 3: Akun & Keamanan
    username: "",
    password: "",
    confirmPassword: "",

    // Agreements
    agreeTerms: false,
    agreePrivacy: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
    } else {
      try {
        setIsSubmitting(true);
        setSubmitError(null);

        if (formData.password !== formData.confirmPassword) {
          throw new Error("Konfirmasi password tidak sama");
        }

        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (!res.ok) {
          throw new Error(data?.error || "Pendaftaran gagal");
        }

        alert(
          "Pendaftaran berhasil! Silakan login, lalu aktifkan paket di halaman Billing.",
        );
        onClose();
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : "Pendaftaran gagal",
        );
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  const provinces = [
    "Aceh",
    "Sumatera Utara",
    "Sumatera Barat",
    "Riau",
    "Jambi",
    "Sumatera Selatan",
    "Bengkulu",
    "Lampung",
    "Kepulauan Bangka Belitung",
    "Kepulauan Riau",
    "DKI Jakarta",
    "Jawa Barat",
    "Jawa Tengah",
    "DI Yogyakarta",
    "Jawa Timur",
    "Banten",
    "Bali",
    "Nusa Tenggara Barat",
    "Nusa Tenggara Timur",
    "Kalimantan Barat",
    "Kalimantan Tengah",
    "Kalimantan Selatan",
    "Kalimantan Timur",
    "Kalimantan Utara",
    "Sulawesi Utara",
    "Sulawesi Tengah",
    "Sulawesi Selatan",
    "Sulawesi Tenggara",
    "Gorontalo",
    "Sulawesi Barat",
    "Maluku",
    "Maluku Utara",
    "Papua",
    "Papua Barat",
  ];

  return (
    <div className="fixed inset-0 z-100 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 my-8 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition-all hover:scale-110 shadow-lg"
          aria-label="Close"
        >
          <X className="w-6 h-6 text-gray-700" />
        </button>

        {/* Header */}
        <div className="relative bg-linear-to-br from-[#0d9488] via-[#0f766e] to-[#0d9488] px-8 py-8 overflow-hidden">
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
            <div className="inline-flex items-center gap-2 mb-4 group">
              <KlandesaLogo
                className="w-10 h-10"
                showText={false}
                variant="white"
              />
            </div>

            <h2 className="text-2xl md:text-3xl text-white mb-2">
              Daftar Desa Baru
            </h2>
            <p className="text-white/90">
              Mulai transformasi digital desa Anda bersama Klandesa
            </p>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/80">
                  Step {step} dari {totalSteps}
                </span>
                <span className="text-sm text-white/80">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="w-full bg-white/20 backdrop-blur-sm rounded-full h-2 overflow-hidden">
                <div
                  className="bg-white h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            {/* Steps Indicator */}
            <div className="mt-6 flex items-center justify-between">
              <div
                className={`flex items-center gap-2 ${step >= 1 ? "opacity-100" : "opacity-50"}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? "bg-white text-[#0d9488]" : "bg-white/20 text-white"}`}
                >
                  {step > 1 ? <CheckCircle2 className="w-5 h-5" /> : "1"}
                </div>
                <span className="text-sm text-white hidden sm:inline">
                  Info Desa
                </span>
              </div>
              <div className="flex-1 h-0.5 bg-white/20 mx-2"></div>
              <div
                className={`flex items-center gap-2 ${step >= 2 ? "opacity-100" : "opacity-50"}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? "bg-white text-[#0d9488]" : "bg-white/20 text-white"}`}
                >
                  {step > 2 ? <CheckCircle2 className="w-5 h-5" /> : "2"}
                </div>
                <span className="text-sm text-white hidden sm:inline">
                  Kontak
                </span>
              </div>
              <div className="flex-1 h-0.5 bg-white/20 mx-2"></div>
              <div
                className={`flex items-center gap-2 ${step >= 3 ? "opacity-100" : "opacity-50"}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? "bg-white text-[#0d9488]" : "bg-white/20 text-white"}`}
                >
                  3
                </div>
                <span className="text-sm text-white hidden sm:inline">
                  Akun
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-8 md:p-12">
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
            {/* Step 1: Informasi Desa */}
            {step === 1 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-5 duration-300">
                <div>
                  <h3 className="text-xl text-gray-900 mb-4 flex items-center gap-2">
                    <Building2 className="w-6 h-6 text-[#0d9488]" />
                    Informasi Desa
                  </h3>
                  <p className="text-gray-600 text-sm mb-6">
                    Lengkapi informasi administrasi desa Anda
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label
                      htmlFor="provinsi"
                      className="block text-sm text-gray-700 mb-2"
                    >
                      Provinsi <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="provinsi"
                      value={formData.provinsi}
                      onChange={(e) =>
                        handleInputChange("provinsi", e.target.value)
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition-all outline-none appearance-none bg-white"
                      required
                    >
                      <option value="">Pilih Provinsi</option>
                      {provinces.map((prov) => (
                        <option key={prov} value={prov}>
                          {prov}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="namaKabupaten"
                      className="block text-sm text-gray-700 mb-2"
                    >
                      Kabupaten/Kota <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="namaKabupaten"
                      value={formData.namaKabupaten}
                      onChange={(e) =>
                        handleInputChange("namaKabupaten", e.target.value)
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition-all outline-none"
                      placeholder="Contoh: Bandung"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="namaKecamatan"
                      className="block text-sm text-gray-700 mb-2"
                    >
                      Kecamatan <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="namaKecamatan"
                      value={formData.namaKecamatan}
                      onChange={(e) =>
                        handleInputChange("namaKecamatan", e.target.value)
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition-all outline-none"
                      placeholder="Contoh: Cicalengka"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="namaDesa"
                      className="block text-sm text-gray-700 mb-2"
                    >
                      Nama Desa <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="namaDesa"
                      value={formData.namaDesa}
                      onChange={(e) =>
                        handleInputChange("namaDesa", e.target.value)
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition-all outline-none"
                      placeholder="Contoh: Cikalong"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Kontak & Penanggung Jawab */}
            {step === 2 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-5 duration-300">
                <div>
                  <h3 className="text-xl text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="w-6 h-6 text-[#0d9488]" />
                    Kontak & Penanggung Jawab
                  </h3>
                  <p className="text-gray-600 text-sm mb-6">
                    Informasi kontak untuk komunikasi dan verifikasi
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="namaKepala"
                    className="block text-sm text-gray-700 mb-2"
                  >
                    Nama Kepala Desa <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="namaKepala"
                    value={formData.namaKepala}
                    onChange={(e) =>
                      handleInputChange("namaKepala", e.target.value)
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition-all outline-none"
                    placeholder="Nama lengkap Kepala Desa"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="emailDesa"
                    className="block text-sm text-gray-700 mb-2"
                  >
                    Email Desa <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      id="emailDesa"
                      value={formData.emailDesa}
                      onChange={(e) =>
                        handleInputChange("emailDesa", e.target.value)
                      }
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition-all outline-none"
                      placeholder="email@desa.id"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="nomorTelepon"
                    className="block text-sm text-gray-700 mb-2"
                  >
                    Nomor Telepon Kantor Desa{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Phone className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      id="nomorTelepon"
                      value={formData.nomorTelepon}
                      onChange={(e) =>
                        handleInputChange("nomorTelepon", e.target.value)
                      }
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition-all outline-none"
                      placeholder="08xxxxxxxxxx"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Akun & Keamanan */}
            {step === 3 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-5 duration-300">
                <div>
                  <h3 className="text-xl text-gray-900 mb-4 flex items-center gap-2">
                    <Lock className="w-6 h-6 text-[#0d9488]" />
                    Akun & Keamanan
                  </h3>
                  <p className="text-gray-600 text-sm mb-6">
                    Buat akun untuk mengakses dashboard Klandesa
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="username"
                    className="block text-sm text-gray-700 mb-2"
                  >
                    Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={formData.username}
                    onChange={(e) =>
                      handleInputChange("username", e.target.value)
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition-all outline-none"
                    placeholder="username"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm text-gray-700 mb-2"
                  >
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      value={formData.password}
                      onChange={(e) =>
                        handleInputChange("password", e.target.value)
                      }
                      className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition-all outline-none"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Minimal 8 karakter, gunakan kombinasi huruf dan angka
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm text-gray-700 mb-2"
                  >
                    Konfirmasi Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        handleInputChange("confirmPassword", e.target.value)
                      }
                      className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition-all outline-none"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Agreements */}
                <div className="space-y-3 pt-4">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formData.agreeTerms}
                      onChange={(e) =>
                        handleInputChange("agreeTerms", e.target.checked)
                      }
                      className="mt-1 w-4 h-4 border-gray-300 rounded text-[#0d9488] focus:ring-[#0d9488]"
                      required
                    />
                    <span className="text-sm text-gray-600 group-hover:text-gray-900">
                      Saya setuju dengan{" "}
                      <a href="#" className="text-[#0d9488] hover:underline">
                        Syarat & Ketentuan
                      </a>
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formData.agreePrivacy}
                      onChange={(e) =>
                        handleInputChange("agreePrivacy", e.target.checked)
                      }
                      className="mt-1 w-4 h-4 border-gray-300 rounded text-[#0d9488] focus:ring-[#0d9488]"
                      required
                    />
                    <span className="text-sm text-gray-600 group-hover:text-gray-900">
                      Saya telah membaca dan memahami{" "}
                      <a href="#" className="text-[#0d9488] hover:underline">
                        Kebijakan Privasi
                      </a>
                    </span>
                  </label>
                </div>
              </div>
            )}

            {submitError && step === totalSteps && (
              <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-sm text-red-800">{submitError}</p>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-4 mt-8 pt-6 border-t border-gray-200">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all"
                >
                  Sebelumnya
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-linear-to-r from-[#0d9488] to-[#0f766e] text-white px-6 py-3 rounded-xl hover:shadow-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2 group"
              >
                <span>
                  {step === totalSteps
                    ? isSubmitting
                      ? "Memproses..."
                      : "Daftar Sekarang"
                    : "Lanjutkan"}
                </span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </form>

          {/* Login Link */}
          <p className="mt-6 text-center text-sm text-gray-600">
            Sudah punya akun?{" "}
            <a
              href="#"
              className="text-[#0d9488] hover:text-[#0f766e] transition-colors"
            >
              Masuk di sini
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
