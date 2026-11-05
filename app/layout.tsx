// import "./globals.css";
import "./styles/fonts.css";
import "./styles/index.css";
import "./styles/tailwind.css";
import "./styles/theme.css";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://klandesa.com";

const APP_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,500;0,7..72,600;0,7..72,700;1,7..72,400&display=swap";

export const metadata: Metadata = {
  title: {
    default: "Klandesa — Aplikasi Desa Terpadu Berbasis SDGs",
    template: "%s | Klandesa",
  },
  description:
    "Klandesa: aplikasi desa terpadu berbasis SDGs—data warga, surat, APB Desa, Dana Desa, RKP Desa, format Kemendesa, dan aplikasi seluler dalam satu sistem.",
  keywords: [
    "aplikasi desa",
    "aplikasi surat desa",
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
    title: "Klandesa — Aplikasi Desa Terpadu Berbasis SDGs",
    description:
      "Aplikasi desa terpadu berbasis SDGs—data warga, surat, APB Desa, Dana Desa, perencanaan, program PKK/BUMDes, dan aplikasi seluler, satu sistem untuk desa dan pemda.",
    images: [
      {
        url: "/images/og-klandesa.png",
        width: 1200,
        height: 630,
        alt: "Klandesa — Aplikasi desa terpadu berbasis SDGs",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Klandesa — Aplikasi Desa Terpadu Berbasis SDGs",
    description:
      "Dari musyawarah sampai laporan: surat, APB Desa, Dana Desa, RKP Desa, format Kemendesa, dan aplikasi seluler dalam satu platform.",
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
      <head>
        {/* Nama keluarga font tetap "Inter"/"Literata" (dipakai --font-sans/--font-serif); hanya cara memuatnya yang lebih cepat. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={APP_FONTS_HREF} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* SessionProvider ada di layout (app): halaman publik tidak perlu memanggil /api/auth/session. */}
        {children}
      </body>
    </html>
  );
}
