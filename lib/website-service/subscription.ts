/**
 * Layanan Website Desa Kustom: dibangun manual per desa, tagihan & masa aktif dikendalikan di Klandesa.
 * Disimpan di VillageModuleSubscription (moduleCode `website_custom`, satu baris per desa). Murni (tanpa DB) agar
 * dipakai bersama server, UI, dan tes.
 */
import { BILLING_CATALOG } from "@/lib/billing/catalog";
import { addMonths, parseDurationMonths, priceForMonths } from "@/lib/billing/duration";

export const WEBSITE_CUSTOM_MODULE_CODE = "website_custom";
/** Satu-satunya planCode untuk checkout layanan ini. */
export const WEBSITE_CUSTOM_PLAN_CODE = "default" as const;
/** Lama masa aktif yang sudah termasuk di biaya awal. */
export const WEBSITE_CUSTOM_FIRST_TERM_MONTHS = 12;

export type WebsiteCustomLineItem = {
  name: string;
  description: string;
  quantity: number;
  unitAmount: number;
  totalAmount: number;
  metadata: { kind: "website_custom_first_term" | "website_custom_renewal"; months: number };
};

/** Langganan aktif = status active dan belum lewat masa berlaku. */
export function isWebsiteCustomActive(
  sub: { status: string; expiryDate: Date } | null | undefined,
  now = Date.now(),
): boolean {
  return Boolean(sub) && sub!.status === "active" && sub!.expiryDate.getTime() > now;
}

/**
 * Pembelian pertama: satu baris biaya awal (12 bulan). Perpanjangan: biaya bulanan × lama yang dipilih.
 * Perpanjangan = desa pernah punya baris langganan (walau sudah habis), jadi biaya awal tidak ditagih dua kali.
 */
export function websiteCustomLineItems(opts: { isRenewal: boolean; months?: unknown }): WebsiteCustomLineItem[] {
  const { name, setupFee, monthlyFee } = BILLING_CATALOG.website_custom;
  if (!opts.isRenewal) {
    return [
      {
        name: `${name} (Biaya Awal, termasuk ${WEBSITE_CUSTOM_FIRST_TERM_MONTHS} bulan pertama)`,
        description: `Pembuatan website + hosting ${WEBSITE_CUSTOM_FIRST_TERM_MONTHS} bulan`,
        quantity: 1,
        unitAmount: setupFee,
        totalAmount: setupFee,
        metadata: { kind: "website_custom_first_term", months: WEBSITE_CUSTOM_FIRST_TERM_MONTHS },
      },
    ];
  }
  const months = parseDurationMonths(opts.months);
  if (months == null) throw new Error("Durasi langganan tidak valid");
  const total = priceForMonths(monthlyFee, months);
  return [
    {
      name: `Perpanjang ${name} (${months} bulan)`,
      description: `Perpanjangan ${months} bulan`,
      quantity: 1,
      unitAmount: total,
      totalAmount: total,
      metadata: { kind: "website_custom_renewal", months },
    },
  ];
}

/** Masa berlaku baru: perpanjangan menyambung sisa waktu yang masih berjalan; bila sudah habis, dihitung dari sekarang. */
export function nextWebsiteCustomExpiry(opts: {
  now: Date;
  currentExpiry: Date | null;
  months: number;
}): Date {
  const base =
    opts.currentExpiry && opts.currentExpiry.getTime() > opts.now.getTime() ? opts.currentExpiry : opts.now;
  return addMonths(base, opts.months);
}
