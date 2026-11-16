import { BILLING_CATALOG, formatIdr } from "@/lib/billing/catalog";

/**
 * Isi dan konfigurasi halaman tujuan iklan Meta (/desa-digital).
 * Angka harga selalu dibaca dari katalog billing; klaim fitur hanya yang tercantum di halaman /harga.
 */
export const ADS_LANDING_PATH = "/desa-digital";
export const ADS_FORM_ID = "minta-dihubungi";

/** Nomor WhatsApp CS yang sama dengan tombol WhatsApp di situs (tanpa +). */
export const ADS_WA_NUMBER = "6282320337777";
export const ADS_WA_MESSAGE = "Halo Klandesa, saya dari iklan Facebook/Instagram dan ingin tahu lebih lanjut tentang aplikasi desa.";

export function adsWhatsAppHref(): string {
  return `https://wa.me/${ADS_WA_NUMBER}?text=${encodeURIComponent(ADS_WA_MESSAGE)}`;
}

const LENGKAP = BILLING_CATALOG.desa_package.tiers.lengkap;

export const ADS_PRICE = {
  setup: formatIdr(LENGKAP.setupFee),
  monthly: formatIdr(LENGKAP.monthlyFee),
  trialDays: 14,
} as const;

export const ADS_BENEFITS = [
  {
    icon: "surat",
    title: "Layanan surat online",
    body: "Warga mengajukan surat lewat aplikasi, perangkat desa memprosesnya di satu tempat.",
  },
  {
    icon: "warga",
    title: "Data warga dan KK",
    body: "Data warga, kartu keluarga, dan perangkat desa tertata, lengkap dengan statistik penduduk.",
  },
  {
    icon: "keuangan",
    title: "APB Desa dan Dana Desa",
    body: "Susun dan pantau APB Desa, Dana Desa, BLT, dan Padat Karya Tunai.",
  },
  {
    icon: "seluler",
    title: "Aplikasi seluler",
    body: "Aplikasi untuk warga, RT, dan perangkat desa, bukan hanya untuk operator di kantor desa.",
  },
] as const;

export const ADS_STEPS = [
  { title: "Isi formulir atau chat WhatsApp", body: "Cukup nama, nomor WhatsApp, dan nama desa." },
  { title: "Tim kami menghubungi Anda", body: "Kami jawab pertanyaan dan tunjukkan fitur yang relevan untuk desa Anda." },
  { title: `Coba gratis ${ADS_PRICE.trialDays} hari`, body: "Aktifkan trial untuk desa Anda dan lihat sendiri apakah cocok." },
] as const;

/** Ringkas parameter iklan dari URL untuk catatan lead (tanpa data pribadi). */
export function summarizeAdAttribution(search: string): string | null {
  const params = new URLSearchParams(search);
  const parts: string[] = [];
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    const value = params.get(key)?.trim().slice(0, 80);
    if (value) parts.push(`${key}=${value}`);
  }
  if (params.get("fbclid")) parts.push("fbclid=ada");
  return parts.length ? parts.join(", ") : null;
}
