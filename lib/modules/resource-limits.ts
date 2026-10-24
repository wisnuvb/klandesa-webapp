import type { DesaPackageTier } from "@/lib/billing/catalog";

export type ResourceLimitResponse = {
  error: "RESOURCE_LIMIT_REACHED";
  limit: number;
  current: number;
  module: string;
  billingUrl: string;
};

// Addon codes match BILLING_CATALOG.module_addon keys and villageModuleSubscription.moduleCode
const ADDON_CODES: Record<string, string> = {
  keuangan: "keuangan",
  bumdes: "bumdes",
  pkk: "pkk",
  sdgs: "sdgs",
  "peta-infrastruktur": "gis",
  "sinkronisasi-data": "integrations",
};

export function isAddonActive(
  moduleId: string,
  activeAddons: { moduleCode: string; expiryDate: Date }[],
): boolean {
  const code = ADDON_CODES[moduleId];
  if (!code) return false;
  const now = Date.now();
  return activeAddons.some((a) => a.moduleCode === code && a.expiryDate.getTime() > now);
}

function isUnlimited(
  tier: string | null | undefined,
  status: string | null | undefined,
  hasAddon: boolean,
  minUnlimitedTier: DesaPackageTier,
): boolean {
  if (hasAddon) return true;
  // During trial, treat as profesional
  const resolvedTier =
    String(status ?? "").toLowerCase() === "trial"
      ? "profesional"
      : String(tier ?? "starter").toLowerCase();
  const rank: Record<string, number> = { starter: 1, profesional: 2, enterprise: 3 };
  return (rank[resolvedTier] ?? 0) >= (rank[minUnlimitedTier] ?? 99);
}

// ---------------------------------------------------------------------------
// Keuangan — 100 transaksi kas per tahun for Starter without addon
// ---------------------------------------------------------------------------
export type KeuanganLimit = { transaksiPerYear: number };

export function keuanganLimit(
  tier: string | null | undefined,
  status: string | null | undefined,
  hasAddon: boolean,
): KeuanganLimit | null {
  if (isUnlimited(tier, status, hasAddon, "profesional")) return null;
  return { transaksiPerYear: 100 };
}

// ---------------------------------------------------------------------------
// BUMDes — 2 unit usaha, 50 transaksi total for Starter without addon
// ---------------------------------------------------------------------------
export type BumdesLimit = { units: number; transactions: number };

export function bumdesLimit(
  tier: string | null | undefined,
  status: string | null | undefined,
  hasAddon: boolean,
): BumdesLimit | null {
  if (isUnlimited(tier, status, hasAddon, "profesional")) return null;
  return { units: 2, transactions: 50 };
}

// ---------------------------------------------------------------------------
// PKK — 5 dasawisma, 12 sesi posyandu total for Starter without addon
// ---------------------------------------------------------------------------
export type PkkLimit = { dasawisma: number; posyanduSessions: number };

export function pkkLimit(
  tier: string | null | undefined,
  status: string | null | undefined,
  hasAddon: boolean,
): PkkLimit | null {
  if (isUnlimited(tier, status, hasAddon, "profesional")) return null;
  return { dasawisma: 5, posyanduSessions: 12 };
}

// ---------------------------------------------------------------------------
// SDGs — no record limit; only export is blocked for Starter without addon
// ---------------------------------------------------------------------------
export type SdgsLimit = { exportBlocked: boolean };

export function sdgsLimit(
  tier: string | null | undefined,
  status: string | null | undefined,
  hasAddon: boolean,
): SdgsLimit | null {
  if (isUnlimited(tier, status, hasAddon, "profesional")) return null;
  return { exportBlocked: true };
}

// ---------------------------------------------------------------------------
// Peta Infrastruktur — tiered limits across Starter and Profesional
// ---------------------------------------------------------------------------
export type PetaLimit = { assets: number; projects: number; disasterPoints: number };

export function petaLimit(
  tier: string | null | undefined,
  status: string | null | undefined,
  hasAddon: boolean,
): PetaLimit | null {
  if (isUnlimited(tier, status, hasAddon, "enterprise")) return null;
  const resolvedTier =
    String(status ?? "").toLowerCase() === "trial"
      ? "profesional"
      : String(tier ?? "starter").toLowerCase();
  if (resolvedTier === "profesional") return { assets: 75, projects: 25, disasterPoints: 50 };
  return { assets: 15, projects: 5, disasterPoints: 10 };
}

// ---------------------------------------------------------------------------
// Sinkronisasi Data — tiered limits across Starter and Profesional
// ---------------------------------------------------------------------------
export type IntegrationsLimit = { adapters: number; scheduledSyncBlocked: boolean };

export function integrationsLimit(
  tier: string | null | undefined,
  status: string | null | undefined,
  hasAddon: boolean,
): IntegrationsLimit | null {
  if (isUnlimited(tier, status, hasAddon, "enterprise")) return null;
  const resolvedTier =
    String(status ?? "").toLowerCase() === "trial"
      ? "profesional"
      : String(tier ?? "starter").toLowerCase();
  if (resolvedTier === "profesional") return { adapters: 3, scheduledSyncBlocked: false };
  return { adapters: 1, scheduledSyncBlocked: true };
}
