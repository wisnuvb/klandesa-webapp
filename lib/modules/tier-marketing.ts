import type { PackageTier } from "./entitlements";
import { getModuleEntitlement } from "./entitlements";
import { VILLAGE_MODULE_REGISTRY } from "./registry";

export type TierMarketingRow = {
  capability: string;
  starter: "yes" | "no" | "addon";
  professional: "yes" | "no" | "addon";
  enterprise: "yes" | "no" | "addon";
  note?: string;
};

/** Modul inti — termasuk di paket Starter. */
export const STARTER_MODULE_IDS = new Set([
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

function cellForTier(
  minTier: PackageTier,
  hasAddon: boolean,
  target: PackageTier,
): "yes" | "no" | "addon" {
  const rank: Record<PackageTier, number> = {
    starter: 1,
    profesional: 2,
    enterprise: 3,
  };
  if (rank[target] >= rank[minTier]) return "yes";
  if (hasAddon) return "addon";
  return "no";
}

function maxRequiredTier(tiers: PackageTier[]): PackageTier {
  if (tiers.includes("enterprise")) return "enterprise";
  if (tiers.includes("profesional")) return "profesional";
  return "starter";
}

function rowForGroup(
  capability: string,
  moduleIds: string[],
  note?: string,
): TierMarketingRow {
  const tiers = moduleIds.map(
    (id) => getModuleEntitlement(id)?.minPackageTier ?? "starter",
  );
  const minTier = maxRequiredTier(tiers);
  const hasAddon = moduleIds.some((id) =>
    Boolean(getModuleEntitlement(id)?.addonProductCode),
  );

  return {
    capability,
    starter: cellForTier(minTier, hasAddon, "starter"),
    professional: cellForTier(minTier, hasAddon, "profesional"),
    enterprise: cellForTier(minTier, hasAddon, "enterprise"),
    note,
  };
}

/** Baris perbandingan modul — disinkronkan dengan lib/modules/entitlements.ts */
export const MODULE_TIER_COMPARISON_ROWS: TierMarketingRow[] = [
  rowForGroup(
    "Administrasi & kependudukan",
    ["data-warga", "data-kk", "data-perangkat", "data-jabatan", "statistik"],
  ),
  rowForGroup(
    "Layanan surat & antrian permohonan",
    ["permohonan-warga", "layanan-mandiri", "layanan-surat"],
  ),
  rowForGroup(
    "Portal warga (pengumuman, forum, pengaduan, bansos)",
    [
      "pengumuman-desa",
      "forum-diskusi",
      "pengaduan-masyarakat",
      "bantuan-program-keluarga",
      "galeri-desa",
    ],
  ),
  rowForGroup("Absensi perangkat desa", ["absensi"]),
  rowForGroup("Arsip digital & katalog UMKM", ["arsip", "ukm"]),
  rowForGroup("Profil desa (potensi, anggaran, koperasi)", ["potensi", "anggaran", "koperasi"]),
  rowForGroup(
    "Asisten Desa AI",
    ["asisten-ai"],
    "Add-on kredit AI — bisa ditambahkan di paket manapun.",
  ),
  rowForGroup("Keuangan Desa", ["keuangan"]),
  rowForGroup("BUMDes & PKK / Posyandu", ["bumdes", "pkk"]),
  rowForGroup("Skor SDGs & RPJMDes", ["sdgs", "rpjmdes"]),
  rowForGroup("Program lapangan (lingkungan, pertanian, RT/RW)", [
    "lingkungan",
    "pertanian",
    "partisipasi-rtrw",
  ]),
  rowForGroup("Website Desa", ["website"]),
  rowForGroup("Peta infrastruktur (GIS)", ["peta-infrastruktur"]),
  rowForGroup(
    "Sinkronisasi data & integrasi",
    ["sinkronisasi-data"],
    "Integrasi resmi ke sistem pusat setelah assessment dan akses API.",
  ),
];

export function listModuleLabelsForTier(tier: PackageTier): string[] {
  return VILLAGE_MODULE_REGISTRY.filter((mod) => {
    if (mod.id === "dashboard" || mod.id === "billing" || mod.id === "pengaturan-desa") {
      return false;
    }
    const ent = getModuleEntitlement(mod.id);
    return ent?.minPackageTier === tier;
  }).map((mod) => mod.label);
}

export function countModulesByTier(): Record<PackageTier, number> {
  const counts: Record<PackageTier, number> = {
    starter: 0,
    profesional: 0,
    enterprise: 0,
  };
  for (const mod of VILLAGE_MODULE_REGISTRY) {
    if (mod.id === "dashboard" || mod.id === "billing" || mod.id === "pengaturan-desa") {
      continue;
    }
    const ent = getModuleEntitlement(mod.id);
    if (ent) counts[ent.minPackageTier] += 1;
  }
  return counts;
}

/** Label modul inti Starter untuk copy marketing singkat. */
export function starterModuleSummary(): string {
  return "administrasi & kependudukan, layanan surat, portal warga, absensi, arsip, dan profil desa";
}

export function profesionalModuleSummary(): string {
  return listModuleLabelsForTier("profesional").slice(0, 6).join(", ");
}
