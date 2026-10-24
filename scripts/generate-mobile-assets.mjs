// Membuat ikon/splash/notifikasi mobile dari logo final di public/brand (SVG). Jalankan ulang bila logo berubah.
import sharp from "sharp";
import { mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const brand = join(root, "public", "brand");
const out = join(root, "mobile", "assets");
mkdirSync(out, { recursive: true });

// Latar adaptive icon Android (rata-rata gradasi ikon); foreground-nya transparan dan sudah di zona aman.
const jobs = [
  ["icon.png", "klandesa-app-icon.svg", 1024],
  ["adaptive-icon.png", "klandesa-android-foreground.svg", 1024],
  ["splash-icon.png", "klandesa-icon.svg", 512],
  ["notification-icon.png", "klandesa-mark-white.svg", 96],
];
for (const [name, svgFile, size] of jobs) {
  const svg = readFileSync(join(brand, svgFile));
  // density tinggi agar SVG dirender tajam sebelum diperkecil
  await sharp(svg, { density: 384 }).resize(size, size).png().toFile(join(out, name));
  console.log("wrote", name, size);
}
