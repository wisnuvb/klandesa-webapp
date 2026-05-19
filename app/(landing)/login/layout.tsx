import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Masuk — Klandesa",
  description:
    "Halaman masuk untuk pengguna terdaftar Klandesa. Akses dashboard administrasi dan layanan desa Anda.",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
