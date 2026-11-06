"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AuthShell } from "../_components/AuthShell";
import { SetAdminPasswordForm } from "./SetAdminPasswordForm";

type State =
  | { kind: "loading" }
  | { kind: "invalid"; inactive?: boolean }
  | { kind: "ok"; token: string; purpose: "INVITE" | "RESET"; name: string; emailMasked: string };

/**
 * Tautan atur sandi memuat token di FRAGMEN URL (`#token=...`): peramban tidak mengirimnya ke server, jadi tidak masuk log akses
 * proxy. Token dibaca di sini, fragmen langsung dihapus dari bilah alamat/riwayat, lalu divalidasi lewat POST (token di body).
 */
export function FragmentGate() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    const raw = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("token") ?? "";
    if (raw) window.history.replaceState(null, "", window.location.pathname);
    let cancelled = false;
    if (!raw) {
      void Promise.resolve().then(() => !cancelled && setState({ kind: "invalid" }));
      return () => {
        cancelled = true;
      };
    }
    fetch("/api/auth/platform/atur-sandi/peek", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: raw }),
      cache: "no-store",
    })
      .then((r) => r.json().catch(() => ({})))
      .then((j: { valid?: boolean; inactive?: boolean; purpose?: "INVITE" | "RESET"; name?: string; emailMasked?: string }) => {
        if (cancelled) return;
        if (j.valid && j.purpose) setState({ kind: "ok", token: raw, purpose: j.purpose, name: j.name ?? "", emailMasked: j.emailMasked ?? "" });
        else setState({ kind: "invalid", inactive: j.inactive });
      })
      .catch(() => !cancelled && setState({ kind: "invalid" }));
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === "loading") {
    return (
      <AuthShell title="Memeriksa tautan…">
        <p role="status" className="flex items-center gap-2 text-sm text-slate-700">
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Mohon tunggu sebentar.
        </p>
      </AuthShell>
    );
  }
  if (state.kind === "invalid") {
    return (
      <AuthShell title="Tautan tidak berlaku" description="Tautan ini sudah dipakai, kedaluwarsa, atau tidak valid.">
        <div className="space-y-3 text-sm text-slate-700">
          <p>{state.inactive ? "Akun ini tidak aktif. Hubungi admin platform lain." : "Minta admin platform lain mengirim tautan baru."}</p>
          <Link href="/auth/signin" className="font-medium text-teal-700 hover:underline">
            Halaman masuk
          </Link>
        </div>
      </AuthShell>
    );
  }
  const invite = state.purpose === "INVITE";
  return (
    <AuthShell
      title={invite ? `Selamat datang, ${state.name}` : "Buat kata sandi baru"}
      description={invite ? "Buat kata sandi akun admin platform Anda." : `Atur ulang kata sandi untuk ${state.emailMasked}.`}
    >
      <SetAdminPasswordForm token={state.token} email={state.emailMasked} invite={invite} />
    </AuthShell>
  );
}
