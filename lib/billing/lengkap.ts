/**
 * Paket Lengkap (keputusan harga 2026-10-24): Rp3.500.000 di awal (sudah termasuk tahun pertama),
 * lalu Rp100.000/bulan mulai tahun ke-2. Logika murni (tanpa DB) agar mudah dites.
 * Paket lama (starter/profesional/enterprise) tidak berubah dan hanya melayani desa yang sudah memakainya.
 */
export const LENGKAP_TIER = "lengkap" as const;
export const LENGKAP_SETUP_FEE = 3_500_000;
export const LENGKAP_MONTHLY_FEE = 100_000;
export const LENGKAP_RENEWAL_MONTHS = [1, 3, 6, 12] as const;
export type LengkapRenewalMonths = (typeof LENGKAP_RENEWAL_MONTHS)[number];

/**
 * Modul fitur yang terbuka penuh (tanpa batas pemakaian, tanpa add-on) di Paket Lengkap.
 * Keputusan 2026-10-29: semua fitur dibuka; add-on hanya untuk hal yang berbiaya dan terukur
 * (penyimpanan arsip, kredit AI, GPS absensi, Website Desa).
 * "website": akses menu terbuka, tetapi produknya (layanan website kustom, productType "website_custom") dipesan lewat
 * menu Website dan dibayar terpisah. Add-on modul "website" Rp149rb di katalog menggandakan jalur itu sehingga
 * diblokir untuk Paket Lengkap.
 */
export const LENGKAP_INCLUDED_MODULE_IDS: ReadonlySet<string> = new Set([
  "website",
  "keuangan",
  "bumdes",
  "pkk",
  "sdgs",
  "rpjmdes",
  "lingkungan",
  "pertanian",
  "partisipasi-rtrw",
  "peta-infrastruktur",
  "sinkronisasi-data",
]);

/** Kode `BILLING_CATALOG.module_addon` untuk modul di atas: tidak boleh dibeli lagi oleh desa Paket Lengkap. */
export const LENGKAP_INCLUDED_ADDON_CODES: ReadonlySet<string> = new Set([
  "website",
  "keuangan",
  "bumdes",
  "pkk",
  "sdgs",
  "lingkungan",
  "pertanian",
  "partisipasi_rtrw",
  "gis",
  "integrations",
]);

export function isLengkapPlan(plan: unknown): boolean {
  return String(plan ?? "").toLowerCase() === LENGKAP_TIER;
}

const LEGACY_TIERS = ["starter", "profesional", "enterprise"] as const;

export function isLegacyTier(plan: unknown): boolean {
  return LEGACY_TIERS.includes(String(plan ?? "").toLowerCase() as (typeof LEGACY_TIERS)[number]);
}

/** Lama perpanjangan yang valid; nilai lain (atau kosong) = 12 bulan. */
export function parseRenewalMonths(raw: unknown): LengkapRenewalMonths {
  const n = Number(raw);
  return (LENGKAP_RENEWAL_MONTHS as readonly number[]).includes(n) ? (n as LengkapRenewalMonths) : 12;
}

export type LengkapLineItem = { name: string; quantity: number; unitAmount: number; totalAmount: number; metadata: { kind: "lengkap_first_year" | "lengkap_renewal"; tier: "lengkap"; months: number } };

/** Pembelian pertama: satu baris Rp3,5 jt (12 bulan). Perpanjangan: Rp100rb × bulan, tanpa biaya awal lagi. */
export function lengkapLineItems(opts: { isRenewal: boolean; months?: unknown }): LengkapLineItem[] {
  if (!opts.isRenewal) {
    return [{
      name: "Paket Lengkap (Biaya Awal, termasuk 12 bulan pertama)", quantity: 1,
      unitAmount: LENGKAP_SETUP_FEE, totalAmount: LENGKAP_SETUP_FEE,
      metadata: { kind: "lengkap_first_year", tier: LENGKAP_TIER, months: 12 },
    }];
  }
  const months = parseRenewalMonths(opts.months);
  return [{
    name: `Perpanjangan Paket Lengkap (${months} bulan)`, quantity: months,
    unitAmount: LENGKAP_MONTHLY_FEE, totalAmount: LENGKAP_MONTHLY_FEE * months,
    metadata: { kind: "lengkap_renewal", tier: LENGKAP_TIER, months },
  }];
}

function addMonths(d: Date, months: number): Date {
  const out = new Date(d);
  const day = out.getDate();
  out.setDate(1);
  out.setMonth(out.getMonth() + months);
  const last = new Date(out.getFullYear(), out.getMonth() + 1, 0).getDate();
  out.setDate(Math.min(day, last));
  return out;
}

/**
 * Masa berlaku baru. Pembelian pertama: dari sekarang. Perpanjangan: disambung dari masa berlaku yang
 * masih berjalan (sisa waktu tidak hangus); bila sudah lewat, dihitung dari sekarang.
 */
export function lengkapNextExpiry(opts: { now: Date; currentExpiry: Date | null; months: number; isRenewal: boolean }): Date {
  const base = opts.isRenewal && opts.currentExpiry && opts.currentExpiry.getTime() > opts.now.getTime() ? opts.currentExpiry : opts.now;
  return addMonths(base, opts.months);
}

/**
 * Paket yang boleh dibeli/diperpanjang di halaman Tagihan.
 * Desa lama yang masih berbayar hanya melihat paketnya sendiri; selain itu (baru, trial, habis) hanya Paket Lengkap.
 */
export function visibleDesaTiers(opts: { plan: string | null | undefined; paid: boolean }): string[] {
  const plan = String(opts.plan ?? "").toLowerCase();
  if (opts.paid && isLegacyTier(plan)) return [plan];
  return [LENGKAP_TIER];
}
