/**
 * Durasi langganan untuk produk berlangganan bulanan (kapasitas absensi, add-on GPS, arsip, add-on modul).
 * Murni (tanpa DB) agar dipakai bersama oleh server, UI, dan tes. Paket Lengkap punya aturan sendiri (lengkap.ts)
 * dengan pilihan yang sama.
 */
export const SUBSCRIPTION_DURATIONS = [1, 3, 6, 12] as const;
export type SubscriptionMonths = (typeof SUBSCRIPTION_DURATIONS)[number];

/**
 * Diskon (persen) per durasi. Semua 0 = harga linear (harga bulanan × bulan), sama dengan perpanjangan Paket Lengkap.
 * Ubah di sini bila pemilik memutuskan diskon bayar di muka; server dan UI otomatis mengikuti.
 */
export const DURATION_DISCOUNT_PERCENT: Record<SubscriptionMonths, number> = {
  1: 0,
  3: 0,
  6: 0,
  12: 0,
};

export function isSubscriptionMonths(n: unknown): n is SubscriptionMonths {
  return (SUBSCRIPTION_DURATIONS as readonly unknown[]).includes(n);
}

/** Durasi dari input klien: kosong = 1 bulan; nilai di luar pilihan = null (ditolak). */
export function parseDurationMonths(raw: unknown): SubscriptionMonths | null {
  if (raw == null || raw === "") return 1;
  const n = Number(raw);
  return isSubscriptionMonths(n) ? n : null;
}

export function priceForMonths(monthlyFee: number, months: SubscriptionMonths): number {
  const discount = DURATION_DISCOUNT_PERCENT[months] ?? 0;
  return Math.round(monthlyFee * months * (1 - discount / 100));
}

export function durationLabel(months: number): string {
  if (months === 12) return "12 bulan (1 tahun)";
  return `${months} bulan`;
}

export function addMonths(base: Date, months: number): Date {
  const out = new Date(base);
  const day = out.getDate();
  out.setDate(1);
  out.setMonth(out.getMonth() + months);
  out.setDate(Math.min(day, new Date(out.getFullYear(), out.getMonth() + 1, 0).getDate()));
  return out;
}

/**
 * Lama langganan yang DIBAYAR, dibaca dari baris tagihan yang ditulis server saat checkout (bukan dari klien saat
 * callback). Dipakai callback untuk menentukan masa berlaku. Tagihan lama tanpa catatan durasi = 1 bulan.
 */
export function monthsFromInvoiceItems(items: ReadonlyArray<{ metadata: unknown }>): SubscriptionMonths {
  for (const it of items) {
    const raw = (it.metadata as { months?: unknown } | null)?.months;
    if (raw == null) continue;
    const parsed = parseDurationMonths(raw);
    if (parsed != null) return parsed;
  }
  return 1;
}
