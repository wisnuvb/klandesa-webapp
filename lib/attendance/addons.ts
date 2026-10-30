/**
 * Add-on absensi berlangganan bulanan: kapasitas perangkat dan GPS radius. Murni (tanpa DB) agar dipakai bersama
 * oleh server, UI, dan tes.
 *
 * Kapasitas: harga = selisih tier yang dibeli dengan tier yang sudah termasuk di paket desa
 * (keputusan pemilik 2026-10-30; Paket Lengkap sudah termasuk 10 perangkat = tier Starter).
 * Kapasitas efektif = yang terbesar antara kapasitas paket dan add-on yang masih aktif.
 */
import { BILLING_CATALOG } from "@/lib/billing/catalog";
import { addMonths } from "@/lib/billing/duration";
import {
  mapVillagePlanToTier,
  maxHistoryDaysForTier,
  staffLimitForTier,
  type AttendanceTier,
} from "./capacity";

/** moduleCode di VillageModuleSubscription untuk add-on kapasitas absensi (satu baris per desa). */
export const ATTENDANCE_CAPACITY_MODULE_CODE = "absensi_capacity";

export type CapacityAddonCode = keyof typeof BILLING_CATALOG.absensi.tiers;

const TIER_BY_CODE: Record<CapacityAddonCode, AttendanceTier> = {
  starter: "TIER_6_10",
  professional: "TIER_11_20",
  business: "TIER_21_30",
  enterprise: "TIER_31_50",
};

export const CAPACITY_ADDON_CODES = Object.keys(TIER_BY_CODE) as CapacityAddonCode[];

export function isCapacityAddonCode(code: unknown): code is CapacityAddonCode {
  return typeof code === "string" && Object.prototype.hasOwnProperty.call(TIER_BY_CODE, code);
}

export function capacityAddonTier(code: CapacityAddonCode): AttendanceTier {
  return TIER_BY_CODE[code];
}

export function capacityAddonStaffLimit(code: CapacityAddonCode): number {
  return staffLimitForTier(TIER_BY_CODE[code]);
}

function listFee(code: CapacityAddonCode): number {
  return BILLING_CATALOG.absensi.tiers[code].monthlyFee;
}

/** Biaya bulanan tier yang sudah termasuk di paket desa (0 bila paket tidak menyertakan tier absensi berbayar). */
function includedFee(plan: string | null | undefined): number {
  const tier = mapVillagePlanToTier(plan);
  const code = CAPACITY_ADDON_CODES.find((c) => TIER_BY_CODE[c] === tier);
  return code ? listFee(code) : 0;
}

/** Harga per bulan add-on kapasitas `code` untuk desa berpaket `plan`. */
export function capacityAddonPrice(plan: string | null | undefined, code: CapacityAddonCode): number {
  return Math.max(0, listFee(code) - includedFee(plan));
}

export type ActiveCapacityAddon = { code: CapacityAddonCode; expiresAt: Date };

/** Tier absensi yang berlaku: yang terbesar antara paket desa dan add-on aktif. */
export function effectiveAttendanceTier(
  plan: string | null | undefined,
  addon: ActiveCapacityAddon | null,
): AttendanceTier {
  const base = mapVillagePlanToTier(plan);
  if (!addon) return base;
  const addonTier = TIER_BY_CODE[addon.code];
  return staffLimitForTier(addonTier) > staffLimitForTier(base) ? addonTier : base;
}

export function effectiveStaffLimit(plan: string | null | undefined, addon: ActiveCapacityAddon | null): number {
  return staffLimitForTier(effectiveAttendanceTier(plan, addon));
}

export function effectiveHistoryDays(plan: string | null | undefined, addon: ActiveCapacityAddon | null): number {
  return maxHistoryDaysForTier(effectiveAttendanceTier(plan, addon));
}

export type CapacityOptionState = "included" | "current" | "lower" | "available";

export type CapacityOption = {
  code: CapacityAddonCode;
  name: string;
  staffLimit: number;
  historyDays: number;
  /** Harga per bulan (selisih dari yang sudah termasuk paket). */
  price: number;
  listPrice: number;
  state: CapacityOptionState;
  /** true bila memilihnya memperpanjang add-on yang sedang aktif. */
  isRenewal: boolean;
};

export function listCapacityOptions(
  plan: string | null | undefined,
  addon: ActiveCapacityAddon | null,
): CapacityOption[] {
  const baseLimit = staffLimitForTier(mapVillagePlanToTier(plan));
  return CAPACITY_ADDON_CODES.map((code) => {
    const staffLimit = capacityAddonStaffLimit(code);
    let state: CapacityOptionState = "available";
    if (staffLimit <= baseLimit) state = "included";
    else if (addon && addon.code === code) state = "current";
    else if (addon && staffLimit < capacityAddonStaffLimit(addon.code)) state = "lower";
    return {
      code,
      name: BILLING_CATALOG.absensi.tiers[code].name,
      staffLimit,
      historyDays: maxHistoryDaysForTier(TIER_BY_CODE[code]),
      price: capacityAddonPrice(plan, code),
      listPrice: listFee(code),
      state,
      isRenewal: addon?.code === code,
    };
  });
}

/**
 * Aturan pembelian: kapasitas yang sudah termasuk di paket tidak dijual; selama add-on aktif hanya boleh memperpanjang
 * kapasitas yang sama atau naik (turun kapasitas menghanguskan sisa masa berlaku yang sudah dibayar).
 */
export function validateCapacityPurchase(opts: {
  plan: string | null | undefined;
  code: string;
  active: ActiveCapacityAddon | null;
}): { ok: true; code: CapacityAddonCode; price: number; isRenewal: boolean } | { ok: false; error: string } {
  if (!isCapacityAddonCode(opts.code)) return { ok: false, error: "Paket kapasitas absensi tidak valid" };
  const limit = capacityAddonStaffLimit(opts.code);
  const baseLimit = staffLimitForTier(mapVillagePlanToTier(opts.plan));
  if (limit <= baseLimit) {
    return { ok: false, error: `Kapasitas ${limit} perangkat sudah termasuk di paket Anda (${baseLimit} perangkat).` };
  }
  if (opts.active && limit < capacityAddonStaffLimit(opts.active.code)) {
    return {
      ok: false,
      error: `Add-on kapasitas ${capacityAddonStaffLimit(opts.active.code)} perangkat masih aktif. Pilih kapasitas yang sama atau lebih besar.`,
    };
  }
  return {
    ok: true,
    code: opts.code,
    price: capacityAddonPrice(opts.plan, opts.code),
    isRenewal: opts.active?.code === opts.code,
  };
}

/** Perpanjangan tier yang sama menyambung dari akhir masa berlaku; naik tier atau mulai baru dihitung 1 bulan dari sekarang. */
export function nextCapacityExpiry(opts: {
  now: Date;
  active: ActiveCapacityAddon | null;
  code: CapacityAddonCode;
  months?: number;
}): Date {
  const renewal = opts.active != null && opts.active.code === opts.code;
  return addMonths(renewal ? opts.active!.expiresAt : opts.now, opts.months ?? 1);
}

/** Add-on GPS aktif = flag menyala dan belum lewat masa berlaku (NULL = tanpa batas). */
export function isGpsAddonActive(
  village: { absensiGpsAddonActive: boolean; absensiGpsAddonExpiry?: Date | null },
  now = Date.now(),
): boolean {
  if (!village.absensiGpsAddonActive) return false;
  const expiry = village.absensiGpsAddonExpiry;
  return expiry == null || expiry.getTime() > now;
}

/** Perpanjangan GPS menyambung dari akhir masa berlaku bila masih aktif dan berbatas waktu. */
export function nextGpsAddonExpiry(opts: {
  now: Date;
  currentExpiry: Date | null | undefined;
  months?: number;
}): Date {
  const base = opts.currentExpiry && opts.currentExpiry.getTime() > opts.now.getTime() ? opts.currentExpiry : opts.now;
  return addMonths(base, opts.months ?? 1);
}
