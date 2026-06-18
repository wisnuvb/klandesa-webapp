import type { DesaPackageTier } from "@/lib/billing/catalog";
import { BILLING_CATALOG } from "@/lib/billing/catalog";
import { getModuleById, VILLAGE_MODULE_REGISTRY, type ModuleDefinition } from "./registry";

export type PackageTier = DesaPackageTier;

const TIER_RANK: Record<PackageTier, number> = {
  starter: 1,
  profesional: 2,
  enterprise: 3,
};

export type ModuleEntitlementDef = {
  moduleId: string;
  minPackageTier: PackageTier;
  addonProductCode?: string;
  /** Modul khusus add-on tanpa tier paket (AI, GPS). */
  addonOnly?: boolean;
};

const CORE_STARTER_IDS = new Set([
  "dashboard",
  "data-warga",
  "data-kk",
  "data-perangkat",
  "data-jabatan",
  "statistik",
  "potensi",
  "anggaran",
  "koperasi",
  "ukm",
  "permohonan-warga",
  "layanan-mandiri",
  "layanan-surat",
  "pengumuman-desa",
  "forum-diskusi",
  "pengaduan-masyarakat",
  "bantuan-program-keluarga",
  "galeri-desa",
  "absensi",
  "arsip",
  "pengaturan-desa",
  "billing",
]);

const PROFESIONAL_IDS = new Set([
  "keuangan",
  "lingkungan",
  "pertanian",
  "partisipasi-rtrw",
  "bumdes",
  "pkk",
  "sdgs",
  "rpjmdes",
  "website",
]);

const ENTERPRISE_IDS = new Set(["peta-infrastruktur", "sinkronisasi-data"]);

const ADDON_ONLY: Record<string, string> = {
  "asisten-ai": "ai_credits",
};

function inferMinTier(moduleId: string): PackageTier {
  if (CORE_STARTER_IDS.has(moduleId)) return "starter";
  if (PROFESIONAL_IDS.has(moduleId)) return "profesional";
  if (ENTERPRISE_IDS.has(moduleId)) return "enterprise";
  return "starter";
}

function inferAddonCode(mod: ModuleDefinition): string | undefined {
  if (ADDON_ONLY[mod.id]) return ADDON_ONLY[mod.id];
  if (mod.billingAddon) return mod.billingAddon;
  if (PROFESIONAL_IDS.has(mod.id) && !mod.billingAddon) {
    return mod.id.replace(/-/g, "_");
  }
  return undefined;
}

function buildEntitlements(): ModuleEntitlementDef[] {
  return VILLAGE_MODULE_REGISTRY.map((mod) => ({
    moduleId: mod.id,
    minPackageTier: inferMinTier(mod.id),
    addonProductCode: inferAddonCode(mod),
    addonOnly: Boolean(ADDON_ONLY[mod.id]),
  }));
}

export const MODULE_ENTITLEMENTS: ModuleEntitlementDef[] = buildEntitlements();

const ENTITLEMENT_BY_ID = new Map(
  MODULE_ENTITLEMENTS.map((e) => [e.moduleId, e]),
);

export function getModuleEntitlement(moduleId: string): ModuleEntitlementDef | undefined {
  return ENTITLEMENT_BY_ID.get(moduleId);
}

export function tierMeetsMinimum(
  villageTier: string | null | undefined,
  required: PackageTier,
): boolean {
  const normalized = String(villageTier ?? "starter").toLowerCase() as PackageTier;
  const rank = TIER_RANK[normalized] ?? 0;
  return rank >= TIER_RANK[required];
}

/** Tier efektif saat trial = profesional. */
export function effectivePackageTier(
  subscriptionPlan: string | null | undefined,
  subscriptionStatus: string | null | undefined,
): PackageTier {
  const status = String(subscriptionStatus ?? "").toLowerCase();
  if (status === "trial") return "profesional";
  const plan = String(subscriptionPlan ?? "starter").toLowerCase() as PackageTier;
  if (plan === "profesional" || plan === "enterprise") return plan;
  return "starter";
}

export type ActiveModuleSub = {
  moduleCode: string;
  planCode: string | null;
  expiryDate: Date;
};

export type ModuleAccessResult = {
  entitled: boolean;
  source: "package" | "addon" | null;
  minPackageTier: PackageTier;
  addonMonthlyFee: number | null;
  locked: boolean;
};

export function getModuleAddonMonthlyFee(addonCode: string | undefined): number | null {
  if (!addonCode) return null;
  const moduleAddons = BILLING_CATALOG.module_addon as Record<
    string,
    { monthlyFee: number }
  >;
  if (moduleAddons[addonCode]) return moduleAddons[addonCode].monthlyFee;
  if (addonCode === "absensi") {
    return BILLING_CATALOG.absensi.tiers.starter.monthlyFee;
  }
  if (addonCode === "arsip") {
    return BILLING_CATALOG.arsip.tiers.starter.monthlyFee;
  }
  if (addonCode === "ai_credits") return null;
  if (addonCode === "absensi_gps_addon") {
    return BILLING_CATALOG.absensi_gps_addon.monthlyFee;
  }
  return null;
}

export function resolveModuleAccess(
  moduleId: string,
  opts: {
    subscriptionPlan: string | null | undefined;
    subscriptionStatus: string | null | undefined;
    subscriptionReadable: boolean;
    activeAddons: ActiveModuleSub[];
    websiteActive?: boolean;
    absensiGpsActive?: boolean;
  },
): ModuleAccessResult {
  const ent = getModuleEntitlement(moduleId);
  const mod = getModuleById(moduleId);
  if (!ent || !mod) {
    return {
      entitled: true,
      source: "package",
      minPackageTier: "starter",
      addonMonthlyFee: null,
      locked: false,
    };
  }

  if (moduleId === "pengaturan-desa" || moduleId === "billing" || moduleId === "dashboard") {
    return {
      entitled: opts.subscriptionReadable,
      source: "package",
      minPackageTier: ent.minPackageTier,
      addonMonthlyFee: null,
      locked: !opts.subscriptionReadable,
    };
  }

  const effectiveTier = effectivePackageTier(
    opts.subscriptionPlan,
    opts.subscriptionStatus,
  );
  const inPackage = tierMeetsMinimum(effectiveTier, ent.minPackageTier);

  const addonCode = ent.addonProductCode;
  const now = Date.now();
  const hasAddon =
    addonCode &&
    opts.activeAddons.some(
      (s) =>
        s.moduleCode === addonCode &&
        s.expiryDate.getTime() > now,
    );

  const websiteEntitled =
    moduleId === "website" && opts.websiteActive === true;

  const entitled =
    opts.subscriptionReadable &&
    (inPackage || hasAddon || websiteEntitled);

  return {
    entitled: Boolean(entitled),
    source: inPackage ? "package" : hasAddon || websiteEntitled ? "addon" : null,
    minPackageTier: ent.minPackageTier,
    addonMonthlyFee: getModuleAddonMonthlyFee(addonCode),
    locked: opts.subscriptionReadable && !entitled,
  };
}

export function listModuleEntitlementsForVillage(opts: {
  subscriptionPlan: string | null | undefined;
  subscriptionStatus: string | null | undefined;
  subscriptionReadable: boolean;
  activeAddons: ActiveModuleSub[];
  websiteActive?: boolean;
}): Record<string, ModuleAccessResult> {
  const out: Record<string, ModuleAccessResult> = {};
  for (const ent of MODULE_ENTITLEMENTS) {
    out[ent.moduleId] = resolveModuleAccess(ent.moduleId, opts);
  }
  return out;
}
