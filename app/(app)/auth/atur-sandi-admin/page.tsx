import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { maskEmail } from "@/lib/rbac/access-links";
import { peekPlatformToken } from "@/lib/platform/admins/tokens";
import { AuthShell } from "../_components/AuthShell";
import { SetAdminPasswordForm } from "./SetAdminPasswordForm";
import { FragmentGate } from "./FragmentGate";

// Tautan berisi token rahasia: jangan bocor lewat Referer dan jangan diindeks.
export const metadata: Metadata = { title: "Buat kata sandi admin", referrer: "no-referrer", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AturSandiAdminPage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  // Tautan baru memakai fragmen (#token=...) yang tak terlihat server: dibaca di klien. Query `?token=` tetap didukung untuk tautan lama.
  if (!token) return <FragmentGate />;
  // Hanya MELIHAT (tidak memakai) token; pemakaian terjadi saat kata sandi dikirim.
  const view = await peekPlatformToken(prisma, token).catch(() => null);

  if (!view || !view.isActive) {
    return (
      <AuthShell title="Tautan tidak berlaku" description="Tautan ini sudah dipakai, kedaluwarsa, atau tidak valid.">
        <div className="space-y-3 text-sm text-slate-700">
          <p>{view && !view.isActive ? "Akun ini tidak aktif. Hubungi admin platform lain." : "Minta admin platform lain mengirim tautan baru."}</p>
          <Link href="/auth/signin" className="font-medium text-teal-700 hover:underline">
            Halaman masuk
          </Link>
        </div>
      </AuthShell>
    );
  }

  const invite = view.purpose === "INVITE";
  return (
    <AuthShell
      title={invite ? `Selamat datang, ${view.name}` : "Buat kata sandi baru"}
      description={invite ? "Buat kata sandi akun admin platform Anda." : `Atur ulang kata sandi untuk ${maskEmail(view.email)}.`}
    >
      <SetAdminPasswordForm token={token} email={maskEmail(view.email)} invite={invite} />
    </AuthShell>
  );
}
