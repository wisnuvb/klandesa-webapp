import type { Metadata } from "next";
import { AppGoogleAnalytics } from "@/components/AppGoogleAnalytics";
import { AuthProvider } from "../components/AuthProvider";
import { AppLayoutClient } from "./AppLayoutClient";

/**
 * Layout dashboard sengaja STATIS: tanpa headers()/auth()/Prisma, jadi HTML shell dilayani tanpa menyentuh DB.
 * Pengecekan sesi + area akun ada di AppLayoutClient (klien), izin per akun dimuat dari /api/account/permissions,
 * dan setiap API tetap menjadi penjaga data yang sebenarnya. Halaman SERVER yang membaca DB langsung (arsip,
 * galeri-desa, ukm) memeriksa akses sendiri lewat requireVillagePageAccess.
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    // SessionProvider hanya di area aplikasi (dulu di root layout, sehingga tiap halaman publik ikut memanggil /api/auth/session).
    // Halaman publik yang hanya memakai signIn()/signOut()/getSession() (modal masuk) tidak membutuhkan provider.
    <AuthProvider>
      <AppLayoutClient>{children}</AppLayoutClient>
      <AppGoogleAnalytics />
    </AuthProvider>
  );
}
