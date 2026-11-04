import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { maskEmail, peekAuthToken } from "@/lib/rbac/access-links";
import { AuthShell } from "../_components/AuthShell";
import { SetPasswordForm } from "./SetPasswordForm";

// Tautan berisi token rahasia: jangan bocor lewat Referer dan jangan diindeks.
export const metadata: Metadata = { title: "Buat kata sandi", referrer: "no-referrer", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AturSandiPage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  // Hanya MELIHAT (tidak memakai) token; pemakaian terjadi saat kata sandi dikirim.
  const view = token ? await peekAuthToken(prisma, token).catch(() => null) : null;

  if (!view || !view.isActive) {
    return (
      <AuthShell title="Tautan tidak berlaku" description="Tautan ini sudah dipakai, kedaluwarsa, atau tidak valid.">
        <div className="space-y-3 text-sm text-slate-700">
          <p>{view && !view.isActive ? "Akun ini tidak aktif. Hubungi admin desa Anda." : "Minta tautan baru: pilih “Lupa kata sandi” di halaman masuk, atau minta admin desa mengirim ulang undangan."}</p>
          <div className="flex gap-4">
            <Link href="/auth/lupa-sandi" className="font-medium text-teal-700 hover:underline">
              Lupa kata sandi
            </Link>
            <Link href="/auth/signin" className="text-slate-600 hover:underline">
              Halaman masuk
            </Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  const invite = view.purpose === "INVITE";
  return (
    <AuthShell
      title={invite ? `Selamat datang, ${view.name}` : "Buat kata sandi baru"}
      description={invite ? "Buat kata sandi untuk mulai memakai Klandesa." : `Atur ulang kata sandi untuk ${maskEmail(view.email)}.`}
    >
      <SetPasswordForm token={token} email={maskEmail(view.email)} />
    </AuthShell>
  );
}
