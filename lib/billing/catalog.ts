export type BillingProductType = "desa_package" | "absensi" | "arsip" | "website";

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
        setupFee: 2_500_000,
        annualFee: 1_200_000,
      },
      profesional: {
        name: "Profesional",
        setupFee: 10_000_000,
        annualFee: 1_200_000,
      },
      enterprise: {
        name: "Enterprise",
        setupFee: 45_000_000,
        annualFee: 1_200_000,
      },
    } satisfies Record<
      DesaPackageTier,
      { name: string; setupFee: number | null; annualFee: number }
    >,
  },
  absensi: {
    tiers: {
      basic: { name: "Basic", monthlyFee: 15_000 },
      starter: { name: "Starter", monthlyFee: 49_000 },
      professional: { name: "Professional", monthlyFee: 99_000 },
      business: { name: "Business", monthlyFee: 149_000 },
      enterprise: { name: "Enterprise", monthlyFee: 249_000 },
    } satisfies Record<
      Exclude<AddonTier, "promax">,
      { name: string; monthlyFee: number }
    >,
  },
  arsip: {
    tiers: {
      basic: { name: "Basic", monthlyFee: 15_000, storageGb: 1 },
      starter: { name: "Starter", monthlyFee: 35_000, storageGb: 5 },
      professional: { name: "Professional", monthlyFee: 99_000, storageGb: 20 },
      business: { name: "Business", monthlyFee: 149_000, storageGb: 50 },
      enterprise: { name: "Enterprise", monthlyFee: 349_000, storageGb: 100 },
      promax: { name: "Pro Max", monthlyFee: 699_000, storageGb: 250 },
    } satisfies Record<
      AddonTier,
      { name: string; monthlyFee: number; storageGb: number }
    >,
  },
  website: {
    enabled: false,
  },
} as const;

export function mapDesaTierToAddonTier(tier: DesaPackageTier): Exclude<AddonTier, "promax"> {
  if (tier === "starter") return "starter";
  if (tier === "profesional") return "professional";
  return "enterprise";
}

/** Ringkasan tagihan paket desa (sama logika dengan kartu di halaman billing). */
export function getDesaPackageCharge(
  tier: DesaPackageTier,
  opts: { subscriptionActive: boolean; currentPlan: string | null },
) {
  const tierInfo = BILLING_CATALOG.desa_package.tiers[tier];
  const isCurrentPlan = opts.currentPlan?.toLowerCase() === tier.toLowerCase();
  const isUpgrade = opts.subscriptionActive && !isCurrentPlan;
  const needsSetupFee = !opts.subscriptionActive || isUpgrade;
  const totalAmount =
    needsSetupFee && tierInfo.setupFee != null ? tierInfo.setupFee : tierInfo.annualFee;
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

