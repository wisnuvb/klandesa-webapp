"use client";

import Link from "next/link";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { getSession, signIn, signOut } from "next-auth/react";

function LandingLoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFormInvalid = useMemo(
    () => !email.trim() || !password.trim() || loading,
    [email, password, loading],
  );

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      try {
        await signOut({ redirect: false });
      } catch (e) {
        console.warn("[landing/login] signOut before login:", e);
      }

      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (!result?.ok) {
        setError(result?.error || "Login gagal. Periksa email dan password Anda.");
        return;
      }

      const freshSession = await getSession();
      if (!freshSession?.user) {
        setError("Sesi tidak terbaca. Silakan refresh lalu coba lagi.");
        return;
      }

      const requestedPath =
        callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
          ? callbackUrl
          : "/dashboard";

      const currentHost = window.location.host;
      const isLocal =
        currentHost.startsWith("localhost") || currentHost.startsWith("127.0.0.1");

      // Samakan alur dengan LoginModal: login sukses diarahkan ke app subdomain.
      const appHost = isLocal ? currentHost : `my.${currentHost.replace(/^(www\.|my\.)?/, "")}`;
      const appUrl = `${window.location.protocol}//${appHost}${requestedPath}`;

      window.location.assign(appUrl);
    } catch {
      setError("Terjadi kesalahan saat login. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-teal-400/25 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-emerald-300/15 blur-3xl" />
      </div>

      <section className="relative z-10 mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 items-center gap-8 px-4 py-10 md:px-8 lg:grid-cols-2">
        <div className="text-white">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-sm backdrop-blur">
            <Sparkles className="h-4 w-4" />
            Portal Layanan Desa
          </p>
          <h1 className="text-3xl font-semibold leading-tight md:text-5xl">
            Kelola layanan desa Anda dalam satu dashboard terintegrasi.
          </h1>
          <p className="mt-4 max-w-xl text-slate-200">
            Masuk untuk mengakses data warga, surat menyurat, dan pengelolaan administrasi desa secara aman.
          </p>

          <div className="mt-8 space-y-3 text-sm text-slate-200">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-teal-300" />
              Autentikasi aman dengan sesi terenkripsi
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-teal-300" />
              Akses berbasis peran untuk desa dan regional
            </div>
          </div>
        </div>

        <div className="w-full rounded-2xl border border-white/15 bg-white/95 p-6 shadow-2xl backdrop-blur md:p-8">
          <h2 className="text-2xl font-semibold text-slate-900">Masuk ke Akun</h2>
          <p className="mt-1 text-sm text-slate-600">Silakan login untuk melanjutkan ke dashboard Anda.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                  placeholder="nama@email.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-11 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={isFormInvalid}
              className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-teal-400"
            >
              {loading ? "Memproses..." : "Masuk"}
            </button>
          </form>

          <div className="mt-5 flex items-center justify-between text-sm text-slate-600">
            <Link href="/" className="hover:text-slate-900 hover:underline">
              Kembali ke beranda
            </Link>
            <Link href="/auth/signin" className="font-medium text-teal-700 hover:text-teal-800 hover:underline">
              Mode login standar
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function LoginPageFallback() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-sm text-slate-400">Memuat halaman masuk…</p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LandingLoginContent />
    </Suspense>
  );
}
