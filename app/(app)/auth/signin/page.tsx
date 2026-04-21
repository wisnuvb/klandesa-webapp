"use client";

import { getSession, signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

export default function SignInPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.ok) {
        const freshSession = await getSession();
        if (freshSession?.user) {
          const next =
            callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
              ? callbackUrl
              : "/dashboard";
          window.location.assign(next);
        } else {
          setError("Sesi tidak terbaca. Coba refresh halaman.");
        }
        return;
      }

      setError(result?.error || "Login gagal. Coba lagi.");
    } catch {
      setError("Terjadi kesalahan saat login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold mb-1">Masuk ke Dashboard</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Silakan login untuk melanjutkan ke akun desa Anda.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              placeholder="nama@email.com"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-70"
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>

        <p className="text-xs text-muted-foreground mt-4">
          Kembali ke beranda? <Link href="/" className="underline">Buka landing page</Link>
        </p>
      </div>
    </div>
  );
}
