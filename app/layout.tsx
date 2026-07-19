// import "./globals.css";
import "./styles/fonts.css";
import "./styles/index.css";
import "./styles/tailwind.css";
import "./styles/theme.css";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "./components/AuthProvider";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://klandesa.com";

export const metadata: Metadata = {
  title: {
    default: "Klandesa — Platform Operasional Desa Berbasis SDGs",
    template: "%s | Klandesa",
  },
  description:
    "Klandesa: platform operasional desa berbasis SDGs—administrasi, RPJMDes, integrasi format Kemendesa, dan modul program warga dalam satu sistem.",
  keywords: [
    "platform SDGs desa",
    "aplikasi desa terintegrasi",
    "digitalisasi desa",
    "integrasi kemendesa",
    "RPJMDes digital",
    "sistem informasi desa",
    "klandesa",
  ],
  authors: [{ name: "Klandesa", url: siteUrl }],
  creator: "Klandesa",
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: siteUrl,
    siteName: "Klandesa",
    title: "Klandesa — Platform Operasional Desa Berbasis SDGs",
    description:
      "Platform operasional desa berbasis SDGs—administrasi, RPJMDes, program PKK/BUMDes, integrasi dokumentasi Kemendesa, satu sistem untuk desa dan pemda.",
    images: [
      {
        url: "/images/og-klandesa.png",
        width: 1200,
        height: 630,
        alt: "Klandesa — Platform operasional desa berbasis SDGs",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Klandesa — Platform Operasional Desa Berbasis SDGs",
    description:
      "Administrasi sampai laporan SDGs: RPJMDes, integrasi dokumentasi Kemendesa, dan modul program dalam satu platform.",
    images: ["/images/og-klandesa.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
        <GoogleAnalytics />
      </body>
    </html>
  );
}
