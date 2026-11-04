"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export function SetPasswordForm({ token, email }: { token: string; email: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) return setError("Konfirmasi kata sandi tidak sama.");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/atur-sandi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Gagal menyimpan kata sandi.");
        return;
      }
      window.location.assign("/auth/signin?sandi=diatur");
    } catch {
      setError("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
    } finally {
      setBusy(false);
    }
  }

  const input =
    "w-full rounded-lg border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200";
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {/* Memberi tahu pengelola kata sandi akun mana yang disimpan. */}
      <input type="text" name="username" autoComplete="username" value={email} readOnly hidden />
      <div className="space-y-1.5">
        <label htmlFor="pw" className="text-sm font-medium text-slate-700">
          Kata sandi baru
        </label>
        <div className="relative">
          <input id="pw" type={show ? "text" : "password"} autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={`${input} pr-11`} aria-describedby="pw-help" />
          <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700" aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}>
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p id="pw-help" className="text-xs text-slate-500">
          Minimal 8 karakter, memuat huruf dan angka.
        </p>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="pw2" className="text-sm font-medium text-slate-700">
          Ulangi kata sandi
        </label>
        <input id="pw2" type={show ? "text" : "password"} autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} />
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy || !password || !confirm} className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-teal-400">
        {busy && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
        {busy ? "Menyimpan…" : "Simpan kata sandi"}
      </button>
    </form>
  );
}
