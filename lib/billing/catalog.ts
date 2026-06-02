export type BillingProductType =
  | "desa_package"
  | "absensi"
  | "absensi_gps_addon"
  | "arsip"
  | "website"
  | "ai_credits";

/** Satu-satunya planCode untuk checkout add-on GPS di LinkQu / invoice. */
export const ABSENSI_GPS_ADDON_PLAN_CODE = "default" as const;

export type DesaPackageTier = "starter" | "profesional" | "enterprise";

export type AddonTier =
  | "basic"
  | "starter"
  | "professional"
  | "business"
  | "enterprise"
  | "promax";

export function formatIdr(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export const BILLING_CATALOG = {
  desa_package: {
    tiers: {
      starter: {
        name: "Starter",
        setupFee: 10_000_000,
        annualFee: 1_200_000,
      },
      profesional: {
        name: "Profesional",
        setupFee: 45_000_000,
        annualFee: 3_500_000,
      },
      enterprise: {
        name: "Enterprise",
        setupFee: 75_000_000,
        annualFee: 5_000_000,
      },
    } satisfies Record<
      DesaPackageTier,
      { name: string; setupFee: number | null; annualFee: number }
    >,
  },
  absensi: {
    tiers: {
      // basic: { name: "Basic", monthlyFee: 15_000 },
      starter: { name: "Starter", monthlyFee: 49_000 },
      professional: { name: "Professional", monthlyFee: 99_000 },
      business: { name: "Business", monthlyFee: 149_000 },
      enterprise: { name: "Enterprise", monthlyFee: 249_000 },
    } satisfies Record<
      Exclude<AddonTier, "promax" | "basic">,
      { name: string; monthlyFee: number }
    >,
  },
  absensi_gps_addon: {
    name: "GPS Radius Add-on",
    monthlyFee: 49_000,
  },
  arsip: {
    tiers: {
      // basic: { name: "Basic", monthlyFee: 15_000, storageGb: 1 },
      starter: { name: "Starter", monthlyFee: 35_000, storageGb: 5 },
      professional: { name: "Professional", monthlyFee: 99_000, storageGb: 20 },
      business: { name: "Business", monthlyFee: 149_000, storageGb: 50 },
      enterprise: { name: "Enterprise", monthlyFee: 349_000, storageGb: 100 },
      promax: { name: "Pro Max", monthlyFee: 699_000, storageGb: 250 },
    } satisfies Record<
      Exclude<AddonTier, "basic">,
      { name: string; monthlyFee: number; storageGb: number }
    >,
  },
  website: {
    enabled: false,
  },
} as const;

/**
 * Tier add-on mapped from desa package (Starter/Professional/Enterprise).
 * Not all `AddonTier` — not "basic" or "business" from here.
 */
export type MappedDesaAddonTier = "starter" | "professional" | "enterprise";

export function mapDesaTierToAddonTier(tier: DesaPackageTier): MappedDesaAddonTier {
  if (tier === "starter") return "starter";
  if (tier === "profesional") return "professional";
  return "enterprise";
}

/** Summary of desa package charge (same logic as card on billing page). */
export function getDesaPackageCharge(
  tier: DesaPackageTier,
  opts: { subscriptionActive: boolean; currentPlan: string | null },
) {
  const tierInfo = BILLING_CATALOG.desa_package.tiers[tier];
  const isCurrentPlan = opts.currentPlan?.toLowerCase() === tier.toLowerCase();
  const isUpgrade = opts.subscriptionActive && !isCurrentPlan;
  const needsSetupFee = !opts.subscriptionActive || isUpgrade;
  const totalAmount =
    needsSetupFee && tierInfo.setupFee != null
      ? tierInfo.setupFee
      : tierInfo.annualFee;
  return {
    tierInfo,
    isCurrentPlan,
    isUpgrade,
    needsSetupFee,
    totalAmount,
  };
}

export function arsipStorageLimitForDesaTierGb(tier: DesaPackageTier): number {
  const addonTier = mapDesaTierToAddonTier(tier);
  return BILLING_CATALOG.arsip.tiers[addonTier].storageGb;
}

/** Add-on modul SDGs / Phase 3 — referensi packaging (checkout terpisah). */
export const SDGS_MODULE_ADDONS = {
  bumdes: { tier: "starter/pro", label: "BUMDes + QRIS" },
  pkk: { tier: "starter", label: "PKK / Dasawisma" },
  sdgs: { tier: "profesional+", label: "Dashboard SDGs + RPJMDes" },
  integrations: { tier: "enterprise", label: "Hub data pemerintah" },
  gis: { tier: "enterprise", label: "Peta & infrastruktur" },
  ai_assistant: { tier: "add-on", label: "AI credits per desa" },
} as const;
