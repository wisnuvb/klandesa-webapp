/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Shield,
  Users,
  X,
  Zap,
} from "lucide-react";
import { signIn, signOut } from "next-auth/react";

// NextAuth will handle auth; Redux sync happens via the hook below
import { useNextAuthSession } from "@/hooks/use-nextauth-session";

import { KlandesaLogo } from "./KlandesaLogo";

interface LoginModalProps {
  onClose: () => void;
}

export function LoginModal({ onClose }: LoginModalProps) {
  const [showPassword, setShowPassword] = React.useState(false);
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  // Initialize hook to sync NextAuth session into Redux store
  useNextAuthSession();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      try {
        await signOut({ redirect: false });
      } catch (e) {
        console.warn("[LoginModal] signOut before login:", e);
      }

      const result = await signIn("credentials", {
        email: username,
        password,
        redirect: false,
      });

      if (result?.ok) {
        toast.success("Login berhasil!");

        // Redirect ke subdomain app
        const currentHost = window.location.host;
        const domain = currentHost.replace(/^(www\.|my\.)?/, ""); // Remove www atau app
        const appUrl = `${window.location.protocol}//my.${domain}`;

        // Redirect ke app subdomain
        window.location.href = appUrl;
        onClose?.();
      } else {
        const message =
          result?.error || "Gagal melakukan login. Silakan coba lagi.";
        toast.error(message);
      }
    } catch (error: Error | any) {
      toast.error(
        error?.message || "Gagal melakukan login. Silakan coba lagi."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const features = [
    {
      icon: Shield,
      title: "Keamanan Terjamin",
      description: "Data Anda terenkripsi dengan standar keamanan tinggi",
    },
    {
      icon: Zap,
      title: "Akses Cepat",
      description: "Login sekali untuk mengakses semua layanan desa",
    },
    {
      icon: Users,
      title: "Terpercaya",
      description: "Dipercaya oleh 100,000+ pengguna di seluruh Indonesia",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <button
          type="button"
          aria-label="Tutup"
          className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300 fill-mode-forwards"
          onClick={onClose}
        />
        <div className="relative z-10 w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 fill-mode-forwards max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition-all hover:scale-110 shadow-lg"
          aria-label="Close"
        >
          <X className="w-6 h-6 text-gray-700" />
        </button>

        <div className="grid md:grid-cols-2 min-h-[min(90vh,36rem)]">
          {/* Left Side - Login Form */}
          <div className="p-8 md:p-12 flex flex-col justify-center">
            <div className="max-w-md mx-auto w-full">
              {/* Header */}
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 mb-6 group">
                  <KlandesaLogo className="w-10 h-10" showText={false} />
                </div>

                <h2 id="login-modal-title" className="text-3xl text-gray-900 mb-2">
                  Selamat Datang Kembali
                </h2>
                <p className="text-gray-600">
                  Masuk ke akun Anda untuk melanjutkan
                </p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email */}
                <div>
                  <label
                    htmlFor="username"
                    className="block text-sm text-gray-700 mb-2"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition-all outline-none"
                      placeholder="nama@email.com"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm text-gray-700 mb-2"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                </div>

                {/* Remember & Forgot */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="w-4 h-4 border-gray-300 rounded text-[#0d9488] focus:ring-[#0d9488]"
                    />
                    <span className="text-sm text-gray-600 group-hover:text-gray-900">
                      Ingat saya
                    </span>
                  </label>
                  <a
                    href="#"
                    className="text-sm text-[#0d9488] hover:text-[#0f766e] transition-colors"
                  >
                    Lupa password?
                  </a>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-linear-to-r from-[#0d9488] to-[#0f766e] text-white py-3.5 rounded-xl hover:shadow-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <span>{isSubmitting ? "Memproses…" : "Masuk"}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </form>

              {/* Divider */}
              {/* <div className="my-6 flex items-center gap-4">
                <div className="flex-1 h-px bg-gray-300"></div>
                <span className="text-sm text-gray-500">atau</span>
                <div className="flex-1 h-px bg-gray-300"></div>
              </div> */}

              {/* Social Login */}
              {/* <div className="grid grid-cols-2 gap-3">
                <button className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all hover:border-gray-400">
                  <div className="w-5 h-5 bg-gray-300 rounded"></div>
                  <span className="text-sm text-gray-700">Google</span>
                </button>
                <button className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all hover:border-gray-400">
                  <div className="w-5 h-5 bg-gray-300 rounded"></div>
                  <span className="text-sm text-gray-700">Facebook</span>
                </button>
              </div> */}

              {/* Sign Up Link */}
              <p className="mt-6 text-center text-sm text-gray-600">
                Belum punya akun?{" "}
                <a
                  href="#"
                  className="text-[#0d9488] hover:text-[#0f766e] transition-colors"
                >
                  Daftar sekarang
                </a>
              </p>
            </div>
          </div>

          {/* Right Side - Features */}
          <div className="relative bg-linear-to-br from-[#0d9488] via-[#0f766e] to-[#0d9488] p-8 md:p-12 hidden md:flex flex-col justify-center overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-10 right-10 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-blob"></div>
              <div className="absolute bottom-10 left-10 w-64 h-64 bg-[#6366f1] rounded-full mix-blend-overlay filter blur-3xl animate-blob animation-delay-2000"></div>
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

            <div className="relative z-10">
              <h3 className="text-3xl text-white mb-4">
                Platform Digitalisasi Terbaik untuk Desa
              </h3>
              <p className="text-white/90 mb-8 text-lg">
                Bergabunglah dengan ribuan desa yang telah bertransformasi
                digital
              </p>

              <div className="space-y-6">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="bg-white/20 p-3 rounded-xl">
                        <feature.icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="text-white mb-1">{feature.title}</h4>
                        <p className="text-white/80 text-sm">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div className="mt-8 grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl text-white mb-1">100K+</div>
                  <div className="text-white/70 text-sm">Pengguna</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl text-white mb-1">500+</div>
                  <div className="text-white/70 text-sm">Desa</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl text-white mb-1">99.9%</div>
                  <div className="text-white/70 text-sm">Uptime</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
