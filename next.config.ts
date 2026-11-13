import type { NextConfig } from "next";
import { buildImageRemotePatterns } from "./lib/image-hosts";

const nextConfig: NextConfig = {
  // /fitur dulu 308 ke /platform; kini hub halaman topik (app/(landing)/fitur).

  /* config options here */
  // Enable experimental features for subdomain routing
  images: {
    // Dulu hostname "**" (optimizer terbuka untuk host mana pun). Sekarang hanya penyimpanan kita + sumber yang dipakai; lihat lib/image-hosts.ts.
    remotePatterns: buildImageRemotePatterns(process.env),
    // Hasil optimasi dipakai ulang lebih lama: gambar yang sama tidak ditranskode ulang tiap 4 jam (default).
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
  // Increase body size limit for bulk uploads
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // HSTS: browser hanya memakai HTTPS ke host ini selama 180 hari. Sengaja TANPA includeSubDomains/preload: domain
          // kustom desa dan subdomain tenant punya sertifikat sendiri, dan keduanya sulit dibatalkan bila ada yang HTTP-only.
          // (Diabaikan browser pada http://, jadi tidak memengaruhi dev lokal.)
          { key: "Strict-Transport-Security", value: "max-age=15552000" },
          // CSP minimal yang TIDAK membatasi skrip/gaya/gambar (CSP penuh perlu nonce untuk skrip inline Next, GA, Turnstile,
          // peta, dll. dan baru aman setelah diuji di staging): hanya menutup plugin, penyuntikan <base>, dan pembingkaian
          // oleh situs lain (sejalan dengan X-Frame-Options SAMEORIGIN).
          { key: "Content-Security-Policy", value: "object-src 'none'; base-uri 'self'; frame-ancestors 'self'" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
