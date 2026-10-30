// Membuat gambar Open Graph 1200x630 (public/images/og-klandesa.png) dari logo putih di public/brand.
// Jalankan ulang bila logo atau tagline berubah: node scripts/generate-og-image.mjs
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const W = 1200;
const H = 630;

const HEADLINE = ["Platform operasional desa", "berbasis SDGs"];
const SUBLINE = "Administrasi, surat, keuangan, RPJMDes, dan laporan SDGs dalam satu sistem.";

// Dua baris judul + garis aksen + subjudul; posisi ditulis eksplisit agar mudah disetel.
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="${W}" y2="${H}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#0d9488"/><stop offset=".6" stop-color="#0f766e"/><stop offset="1" stop-color="#0a4a45"/>
    </linearGradient>
    <radialGradient id="glow" cx="1000" cy="80" r="520" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#6366f1" stop-opacity=".45"/><stop offset="1" stop-color="#6366f1" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <g font-family="Helvetica Neue, Helvetica, Arial, sans-serif" fill="#ffffff">
    <text x="80" y="320" font-size="72" font-weight="800">${HEADLINE[0]}</text>
    <text x="80" y="402" font-size="72" font-weight="800">${HEADLINE[1]}</text>
    <rect x="80" y="440" width="96" height="6" rx="3" fill="#fbbf24"/>
    <text x="80" y="500" font-size="30" fill-opacity=".9">${SUBLINE}</text>
    <text x="80" y="570" font-size="26" font-weight="600" fill-opacity=".75">klandesa.com</text>
  </g>
</svg>`;
const logo = await sharp(readFileSync(join(root, "public", "brand", "klandesa-logo-white.svg")), { density: 288 })
  .resize({ width: 360 })
  .png()
  .toBuffer();

await sharp(Buffer.from(svg))
  .composite([{ input: logo, left: 80, top: 80 }])
  .png({ compressionLevel: 9 })
  .toFile(join(root, "public", "images", "og-klandesa.png"));

console.log("wrote public/images/og-klandesa.png", `${W}x${H}`);
