import type { NextConfig } from "next";
import { buildImageRemotePatterns } from "./lib/image-hosts";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/fitur", destination: "/platform", permanent: true },
    ];
  },

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
