"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Loader2, Mail, MailCheck } from "lucide-react";
import { TurnstileWidget } from "@/components/security/TurnstileWidget";
import { isTurnstileRequiredOnClient } from "@/lib/turnstile-config";
import { AuthShell } from "../_components/AuthShell";

export default function LupaSandiPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReset, setTurnstileReset] = useState(0);
  const turnstileRequired = isTurnstileRequiredOnClient();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/lupa-sandi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), turnstileToken }),
      });
      const json = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!res.ok) {
        setError(json.error ?? "Gagal memproses permintaan. Coba lagi.");
        setTurnstileReset((n) => n + 1);
        return;
      }
      setDone(json.message ?? "Jika email itu terdaftar, tautan atur ulang kata sandi telah dikirim.");
    } catch {
      setError("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
      setTurnstileReset((n) => n + 1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Lupa kata sandi" description="Masukkan email akun Anda. Kami akan mengirim tautan untuk membuat kata sandi baru.">
      {done ? (
        <div role="status" className="space-y-4">
          <p className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
            <MailCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {done}
          </p>
          <p className="text-sm text-slate-600">Tautan berlaku 1 jam dan hanya bisa dipakai sekali. Belum masuk? Periksa folder spam, lalu coba lagi setelah beberapa menit.</p>
          <Link href="/auth/signin" className="inline-block text-sm font-medium text-teal-700 hover:underline">
            Kembali ke halaman masuk
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
              />
            </div>
          </div>
          <TurnstileWidget onToken={setTurnstileToken} resetSignal={turnstileReset} />
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || !email.trim() || (turnstileRequired && !turnstileToken)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-teal-400"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
            {busy ? "Mengirim…" : "Kirim tautan"}
          </button>
          <Link href="/auth/signin" className="block text-center text-sm text-slate-600 hover:text-slate-900 hover:underline">
            Kembali ke halaman masuk
          </Link>
        </form>
      )}
    </AuthShell>
  );
}
