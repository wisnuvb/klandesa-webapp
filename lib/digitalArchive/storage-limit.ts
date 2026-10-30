/**
 * Kuota arsip digital. Murni (tanpa DB) agar dipakai server, UI, dan tes.
 * Kuota = yang terbesar dari: nilai tersimpan di desa (default/penyesuaian admin), kuota dasar paket,
 * dan add-on arsip yang MASIH aktif (berlangganan bulanan, lihat ARSIP_ADDON_MODULE_CODE).
 */
import { addMonths } from "@/lib/billing/duration";
import {
  BILLING_CATALOG,
  arsipStorageLimitForDesaTierGb,
  type DesaPackageTier,
} from "@/lib/billing/catalog";

/** moduleCode di VillageModuleSubscription untuk add-on kapasitas arsip (satu baris per desa). */
export const ARSIP_ADDON_MODULE_CODE = "arsip_storage";

export function normalizeVillagePlanToDesaTier(plan: string | null | undefined): DesaPackageTier {
  const p = String(plan ?? "starter").toLowerCase();
  if (p === "lengkap") return "lengkap";
  if (p === "profesional" || p === "professional") return "profesional";
  if (p === "enterprise") return "enterprise";
  return "starter";
}

/** Kapasitas (GB) dari kode tier arsip di katalog ("professional", "business", ...); 0 bila tidak dikenal. */
export function arsipGbForPlanCode(planCode: string | null | undefined): number {
  const tiers = BILLING_CATALOG.arsip.tiers as Record<string, { storageGb: number }>;
  return tiers[String(planCode ?? "")]?.storageGb ?? 0;
}

/** Kuota dasar paket desa (GB): yang sudah termasuk tanpa add-on. */
export function arsipBaseGbForPlan(plan: string | null | undefined): number {
  return arsipStorageLimitForDesaTierGb(normalizeVillagePlanToDesaTier(plan));
}

export function computeStorageLimitGb(opts: {
  plan: string | null | undefined;
  storedGb: number;
  activeAddonGb: number;
}): number {
  const stored = Math.max(0, Math.floor(Number(opts.storedGb) || 0));
  return Math.max(stored, arsipBaseGbForPlan(opts.plan), Math.max(0, opts.activeAddonGb));
}

/** Add-on arsip aktif = status active dan belum lewat masa berlaku. */
export function isArsipAddonActive(sub: { status: string; expiryDate: Date } | null | undefined, now = Date.now()): boolean {
  return Boolean(sub) && sub!.status === "active" && sub!.expiryDate.getTime() > now;
}

/**
 * Aturan pembelian: kapasitas yang sudah termasuk di paket tidak dijual; selama add-on aktif hanya boleh memperpanjang
 * kapasitas yang sama atau naik ke yang lebih besar (turun kapasitas menghanguskan sisa masa berlaku yang sudah dibayar).
 */
export function validateArsipPurchase(opts: {
  plan: string | null | undefined;
  tierCode: string;
  active: { planCode: string | null; expiryDate: Date } | null;
}): { ok: true } | { ok: false; error: string } {
  const gb = arsipGbForPlanCode(opts.tierCode);
  if (gb <= 0) return { ok: false, error: "Paket arsip tidak valid" };
  const base = arsipBaseGbForPlan(opts.plan);
  if (gb <= base) return { ok: false, error: `Kapasitas ${gb} GB sudah termasuk di paket Anda (${base} GB).` };
  if (opts.active) {
    const activeGb = arsipGbForPlanCode(opts.active.planCode);
    if (gb < activeGb) {
      return {
        ok: false,
        error: `Add-on arsip ${activeGb} GB masih aktif. Perpanjang kapasitas yang sama atau pilih kapasitas lebih besar.`,
      };
    }
  }
  return { ok: true };
}

/** Masa berlaku baru: perpanjangan kapasitas yang sama menyambung sisa waktu; upgrade atau pembelian baru mulai dari sekarang. */
export function nextArsipExpiry(opts: {
  now: Date;
  active: { planCode: string | null; expiryDate: Date } | null;
  tierCode: string;
  /** Lama langganan yang dibayar; default 1 bulan. */
  months?: number;
}): Date {
  const sameTierRenewal = opts.active != null && opts.active.planCode === opts.tierCode;
  const base = sameTierRenewal ? opts.active!.expiryDate : opts.now;
  return addMonths(base, opts.months ?? 1);
}
