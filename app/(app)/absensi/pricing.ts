import type { SubscriptionTier } from "./types";

export interface PricingTier {
  id: SubscriptionTier;
  name: string;
  staffRange: string;
  price: number;
  priceLabel: string;
  features: string[];
  recommended?: boolean;
}

export const pricingTiers: PricingTier[] = [
  // {
  //   id: "FREE",
  //   name: "Basic",
  //   staffRange: "1-5 Pegawai",
  //   price: 15000,
  //   priceLabel: "Rp 15.000",
  //   features: ["✅ QR Code Absensi", "✅ Laporan Basic", "✅ Max 5 Pegawai"],
  // },
  {
    id: "TIER_6_10",
    name: "Starter",
    staffRange: "6-10 Pegawai",
    price: 49000,
    priceLabel: "Rp 49.000",
    features: [
      "✅ QR Code Absensi",
      "✅ Laporan Lengkap",
      "✅ 6-10 Pegawai",
      "✅ Export Data",
    ],
  },
  {
    id: "TIER_11_20",
    name: "Professional",
    staffRange: "11-20 Pegawai",
    price: 99000,
    priceLabel: "Rp 99.000",
    features: [
      "✅ Semua Fitur Starter",
      "✅ 11-20 Pegawai",
      "✅ Dashboard Analytics",
      "✅ Support Priority",
    ],
    recommended: true,
  },
  {
    id: "TIER_21_30",
    name: "Business",
    staffRange: "21-30 Pegawai",
    price: 149000,
    priceLabel: "Rp 149.000",
    features: [
      "✅ Semua Fitur Professional",
      "✅ 21-30 Pegawai",
      "✅ Multi Shift",
      "✅ API Access",
    ],
  },
  {
    id: "TIER_31_50",
    name: "Enterprise",
    staffRange: "31-50 Pegawai",
    price: 249000,
    priceLabel: "Rp 249.000",
    features: [
      "✅ Semua Fitur Business",
      "✅ 31-50 Pegawai",
      "✅ Dedicated Support",
      "✅ Custom Features",
    ],
  },
];

export function staffLimitForTier(tier: SubscriptionTier) {
  if (tier === "FREE") return 5;
  if (tier === "TIER_6_10") return 10;
  if (tier === "TIER_11_20") return 20;
  if (tier === "TIER_21_30") return 30;
  if (tier === "TIER_31_50") return 50;
  return 50;
}

export function planLabelFromTier(tier: SubscriptionTier) {
  if (tier === "FREE") return "Basic";
  if (tier === "TIER_6_10") return "Starter";
  if (tier === "TIER_11_20") return "Professional";
  if (tier === "TIER_21_30") return "Business";
  if (tier === "TIER_31_50") return "Enterprise";
  return "Custom";
}

export function getRecommendedTierByTotalStaff(totalStaff: number) {
  if (totalStaff <= 5) return pricingTiers[0];
  if (totalStaff <= 10) return pricingTiers[1];
  if (totalStaff <= 20) return pricingTiers[2];
  if (totalStaff <= 30) return pricingTiers[3];
  return pricingTiers[4];
}
