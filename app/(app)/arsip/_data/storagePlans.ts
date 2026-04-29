import type { PlanDetail, StoragePlan, VillageStorageInfo } from "../_types";
import {
  // Zap,
  Rocket,
  TrendingUp,
  Building2,
  Crown,
  Sparkles,
} from "lucide-react";

export const STORAGE_PLANS: PlanDetail[] = [
  // {
  //   id: "FREE",
  //   name: "Basic",
  //   icon: Zap,
  //   storage: 1,
  //   storageLabel: "1 GB",
  //   price: 15000,
  //   priceLabel: "Rp 15.000",
  //   color: "text-gray-600",
  //   bgColor: "bg-gray-100",
  //   borderColor: "border-gray-300",
  //   features: ["1 GB Storage", "Upload file dasar", "Akses file manager", "Support email"],
  // },
  {
    id: "STARTER",
    name: "Starter",
    icon: Rocket,
    storage: 5,
    storageLabel: "5 GB",
    price: 35000,
    priceLabel: "Rp 35.000",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    borderColor: "border-blue-300",
    features: ["5 GB Storage", "Upload file unlimited", "File sharing", "Support prioritas"],
  },
  {
    id: "PROFESSIONAL",
    name: "Professional",
    icon: TrendingUp,
    storage: 20,
    storageLabel: "20 GB",
    price: 99000,
    priceLabel: "Rp 99.000",
    color: "text-teal-600",
    bgColor: "bg-teal-100",
    borderColor: "border-teal-300",
    features: ["20 GB Storage", "Semua fitur Starter", "Versioning file", "Backup otomatis"],
    popular: true,
  },
  {
    id: "BUSINESS",
    name: "Business",
    icon: Building2,
    storage: 50,
    storageLabel: "50 GB",
    price: 149000,
    priceLabel: "Rp 149.000",
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    borderColor: "border-purple-300",
    features: ["50 GB Storage", "Semua fitur Professional", "Multi-user access", "Audit log"],
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    icon: Crown,
    storage: 100,
    storageLabel: "100 GB",
    price: 349000,
    priceLabel: "Rp 349.000",
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    borderColor: "border-orange-300",
    features: ["100 GB Storage", "Semua fitur Business", "API access", "Dedicated support"],
  },
  {
    id: "PROMAX",
    name: "Pro Max",
    icon: Sparkles,
    storage: 250,
    storageLabel: "250 GB",
    price: 699000,
    priceLabel: "Rp 699.000",
    color: "text-pink-600",
    bgColor: "bg-pink-100",
    borderColor: "border-pink-300",
    features: ["250 GB Storage", "Semua fitur Enterprise", "Custom branding", "99.9% uptime SLA"],
  },
];

export function getCurrentPlanFromVillage(
  village: VillageStorageInfo,
): StoragePlan {
  const plan = (village.subscriptionPlan || "").toLowerCase();
  if (plan === "enterprise") return "ENTERPRISE";
  if (plan === "profesional" || plan === "professional") return "PROFESSIONAL";
  if (plan === "starter") return "STARTER";
  if (village.storageLimitGb >= 250) return "PROMAX";
  if (village.storageLimitGb >= 100) return "ENTERPRISE";
  if (village.storageLimitGb >= 50) return "BUSINESS";
  if (village.storageLimitGb >= 20) return "PROFESSIONAL";
  if (village.storageLimitGb >= 5) return "STARTER";
  return "FREE";
}

export function getPlanDetailById(planId: StoragePlan): PlanDetail {
  return STORAGE_PLANS.find((p) => p.id === planId) || STORAGE_PLANS[0];
}
