"use client";

import Link from "next/link";
import { LogIn, UserPlus } from "lucide-react";
import { useLandingModals } from "@/app/(landing)/layout";
import { btnOutline, btnPrimary } from "./ui";

/** Tombol masuk/daftar di halaman penjelas klaim; membuka modal landing yang sama dengan navbar. */
export function ClaimAuthButtons({ slug }: { slug: string }) {
  const { setShowLogin, setShowRegistration } = useLandingModals();
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <button type="button" onClick={() => setShowRegistration(true)} className={btnPrimary}>
        <UserPlus className="h-5 w-5" aria-hidden="true" />
        Daftarkan desa saya
      </button>
      <button type="button" onClick={() => setShowLogin(true)} className={btnOutline}>
        <LogIn className="h-5 w-5" aria-hidden="true" />
        Masuk ke akun desa
      </button>
      <Link href={`/aspirasi-publik?klaim=${encodeURIComponent(slug)}`} className={btnOutline}>
        Buka dasbor Aspirasi Publik
      </Link>
    </div>
  );
}
