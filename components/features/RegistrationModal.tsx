"use client";

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
import { useAppDialogs } from "@/components/providers/AppDialogProvider";
import { getStoredReferralCode } from "@/lib/referrals/client";
import { TurnstileWidget } from "@/components/security/TurnstileWidget";
import { Combobox } from "@/components/ui/combobox";
import { ProvinceLogo } from "@/components/wilayah/ProvinceLogo";
import { PROVINSI_CODES, matchProvinceCode } from "@/lib/pangan/match-region";
import {
  extractArray,
  type KabKotaRow,
  type KecamatanRow,
} from "@/lib/pangan/region-master";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import Link from "next/link";

interface RegistrationModalProps {
  onClose: () => void;
  onOpenLogin?: () => void;
}

export function RegistrationModal({
  onClose,
  onOpenLogin,
}: RegistrationModalProps) {
  const { appAlert } = useAppDialogs();
  const [step, setStep] = React.useState(1);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = React.useState<string | null>(
    null,
  );
  const [kodeProvinsi, setKodeProvinsi] = React.useState("");
  const [kodeKabKota, setKodeKabKota] = React.useState("");
  const [kodeKecamatan, setKodeKecamatan] = React.useState("");
  const [kabkota, setKabkota] = React.useState<KabKotaRow[]>([]);
  const [kecamatanList, setKecamatanList] = React.useState<KecamatanRow[]>([]);
  const [loadingKab, setLoadingKab] = React.useState(false);
  const [loadingKec, setLoadingKec] = React.useState(false);

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
    password: "",
    confirmPassword: "",

    // Agreements
    agreeTerms: false,
    agreePrivacy: false,
  });

  const turnstileRequired = Boolean(
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim(),
  );

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

        if (turnstileRequired && !turnstileToken) {
          throw new Error("Selesaikan verifikasi keamanan terlebih dahulu");
        }

        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            namaKabupaten: formData.namaKabupaten,
            namaKecamatan: formData.namaKecamatan,
            namaDesa: formData.namaDesa,
            provinsi: formData.provinsi,
            namaKepala: formData.namaKepala,
            nomorTelepon: formData.nomorTelepon,
            emailDesa: formData.emailDesa,
            password: formData.password,
            confirmPassword: formData.confirmPassword,
            agreeTerms: formData.agreeTerms,
            agreePrivacy: formData.agreePrivacy,
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
          throw new Error(data?.error || "Pendaftaran gagal");
        }

        const login = await signIn("credentials", {
          email: formData.emailDesa,
          password: formData.password,
          turnstileToken,
          redirect: false,
        });

        if (!login?.ok) {
          void appAlert({
            title: "Pendaftaran berhasil",
            description: "Silakan login untuk melanjutkan onboarding.",
          });
          onClose();
          onOpenLogin?.();
          return;
        }

        toast.success("Selamat datang! Trial Profesional 14 hari aktif.");
        onClose();

        const currentHost = window.location.host;
        const domain = currentHost.replace(/^(www\.|my\.)?/, "");
        const appUrl = `${window.location.protocol}//my.${domain}/onboarding`;
        window.location.href = appUrl;
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

  const resetKabKota = React.useCallback(() => {
    setKodeKabKota("");
    setKodeKecamatan("");
    setKabkota([]);
    setKecamatanList([]);
    setFormData((prev) => ({
      ...prev,
      namaKabupaten: "",
      namaKecamatan: "",
    }));
  }, []);

  const resetKecamatan = React.useCallback(() => {
    setKodeKecamatan("");
    setKecamatanList([]);
    setFormData((prev) => ({
      ...prev,
      namaKecamatan: "",
    }));
  }, []);

  const loadKabkota = React.useCallback(async (kodeProv: string) => {
    if (!kodeProv) {
      setKabkota([]);
      return;
    }
    setLoadingKab(true);
    try {
      const res = await fetch(
        `/api/pangan/kab-kota/${encodeURIComponent(kodeProv)}`,
        { cache: "no-store" },
      );
      const json = (await res.json().catch(() => null)) as {
        data?: unknown;
      } | null;
      setKabkota(extractArray<KabKotaRow>(json?.data));
    } catch {
      setKabkota([]);
    } finally {
      setLoadingKab(false);
    }
  }, []);

  const loadKecamatan = React.useCallback(async (kodeKab: string) => {
    if (!kodeKab) {
      setKecamatanList([]);
      return;
    }
    setLoadingKec(true);
    try {
      const res = await fetch(
        `/api/wilayah/kecamatan/${encodeURIComponent(kodeKab)}`,
        { cache: "no-store" },
      );
      const json = (await res.json().catch(() => null)) as {
        data?: unknown;
      } | null;
      const rows = extractArray<KecamatanRow>(json);
      setKecamatanList(rows);
    } catch {
      setKecamatanList([]);
    } finally {
      setLoadingKec(false);
    }
  }, []);

  React.useEffect(() => {
    if (!kodeProvinsi) {
      setKabkota([]);
      return;
    }
    void loadKabkota(kodeProvinsi);
  }, [kodeProvinsi, loadKabkota]);

  React.useEffect(() => {
    if (!kodeKabKota) {
      setKecamatanList([]);
      return;
    }
    void loadKecamatan(kodeKabKota);
  }, [kodeKabKota, loadKecamatan]);

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  const provinceOptions = React.useMemo(
    () =>
      PROVINSI_CODES.map((p) => ({
        value: p.nama_provinsi,
        label: p.nama_provinsi,
        icon: (
          <ProvinceLogo
            kodeProvinsi={p.kode_provinsi}
            name={p.nama_provinsi}
            size={24}
          />
        ),
      })),
    [],
  );

  const kabOptions = React.useMemo(
    () =>
      kabkota.map((k) => ({
        value: k.kode_kab_kota,
        label: k.nama_kab_kota,
        keywords: k.nama_kab_kota,
      })),
    [kabkota],
  );

  const kecamatanOptions = React.useMemo(
    () =>
      kecamatanList.map((k) => ({
        value: k.kode_kecamatan,
        label: k.nama_kecamatan,
        keywords: k.nama_kecamatan,
      })),
    [kecamatanList],
  );

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
                // className="w-10 h-10"
                // showText={false}
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
                  <p className="text-gray-600 text-sm mb-4">
                    Lengkapi informasi administrasi desa Anda
                  </p>
                  <p className="inline-flex items-center gap-2 text-xs font-medium text-[#0f766e] bg-teal-50 border border-teal-100 rounded-full px-3 py-1">
                    Gratis 14 hari · Paket Profesional · Tanpa Perlu Bayar
                    Sebelumnya
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
                    <Combobox
                      value={formData.provinsi}
                      onValueChange={(value) => {
                        handleInputChange("provinsi", value);
                        setKodeProvinsi(matchProvinceCode(value) ?? "");
                        resetKabKota();
                      }}
                      options={provinceOptions}
                      placeholder="Pilih Provinsi"
                      searchPlaceholder="Cari provinsi..."
                      emptyText="Provinsi tidak ditemukan."
                    />
                    <input
                      id="provinsi"
                      type="text"
                      value={formData.provinsi}
                      onChange={() => {}}
                      className="sr-only"
                      tabIndex={-1}
                      required
                      aria-hidden
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="namaKabupaten"
                      className="block text-sm text-gray-700 mb-2"
                    >
                      Kabupaten/Kota <span className="text-red-500">*</span>
                    </label>
                    <Combobox
                      value={kodeKabKota}
                      onValueChange={(next) => {
                        const row = kabkota.find(
                          (k) => k.kode_kab_kota === next,
                        );
                        setKodeKabKota(next);
                        handleInputChange(
                          "namaKabupaten",
                          row?.nama_kab_kota ?? "",
                        );
                        resetKecamatan();
                      }}
                      options={kabOptions}
                      placeholder={
                        !kodeProvinsi
                          ? "Pilih provinsi dulu"
                          : loadingKab
                            ? "Memuat daftar kab/kota..."
                            : "Pilih kabupaten/kota"
                      }
                      searchPlaceholder="Cari kabupaten/kota..."
                      emptyText="Kabupaten/kota tidak ditemukan."
                      disabled={!kodeProvinsi || loadingKab}
                    />
                    <input
                      id="namaKabupaten"
                      type="text"
                      value={formData.namaKabupaten}
                      onChange={() => {}}
                      className="sr-only"
                      tabIndex={-1}
                      required
                      aria-hidden
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="namaKecamatan"
                      className="block text-sm text-gray-700 mb-2"
                    >
                      Kecamatan <span className="text-red-500">*</span>
                    </label>
                    <Combobox
                      value={kodeKecamatan}
                      onValueChange={(next) => {
                        const row = kecamatanList.find(
                          (k) => k.kode_kecamatan === next,
                        );
                        setKodeKecamatan(next);
                        handleInputChange(
                          "namaKecamatan",
                          row?.nama_kecamatan ?? "",
                        );
                      }}
                      options={kecamatanOptions}
                      placeholder={
                        !kodeKabKota
                          ? "Pilih kabupaten/kota dulu"
                          : loadingKec
                            ? "Memuat daftar kecamatan..."
                            : "Pilih kecamatan"
                      }
                      searchPlaceholder="Cari kecamatan..."
                      emptyText="Kecamatan tidak ditemukan."
                      disabled={!kodeKabKota || loadingKec}
                    />
                    <input
                      id="namaKecamatan"
                      type="text"
                      value={formData.namaKecamatan}
                      onChange={() => {}}
                      className="sr-only"
                      tabIndex={-1}
                      required
                      aria-hidden
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

                <TurnstileWidget className="pt-2" onToken={setTurnstileToken} />

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
                      <Link
                        href="/terms-of-service"
                        className="text-[#0d9488] hover:underline"
                      >
                        Syarat & Ketentuan
                      </Link>
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
                      <Link
                        href="/privacy-policy"
                        className="text-[#0d9488] hover:underline"
                      >
                        Kebijakan Privasi
                      </Link>
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
                disabled={
                  isSubmitting ||
                  (step === totalSteps && turnstileRequired && !turnstileToken)
                }
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
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenLogin?.();
              }}
              className="text-[#0d9488] hover:text-[#0f766e] transition-colors font-medium"
            >
              Masuk di sini
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
