import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Enable experimental features for subdomain routing
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // Increase body size limit for bulk uploads
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;
