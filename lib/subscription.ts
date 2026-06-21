import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export type SubscriptionStatusSummary = {
  subscriptionStatus?: string | null;
  subscriptionExpiry?: Date | null;
};

export type SubscriptionPhase = "trial" | "grace" | "active" | "inactive";

export const TRIAL_DAYS = 14;
export const GRACE_DAYS = 7;
/** Tampilkan banner peringatan saat paket berbayar akan habis dalam N hari. */
export const SUBSCRIPTION_EXPIRING_SOON_DAYS = 30;
export const SUBSCRIPTION_EXPIRING_URGENT_DAYS = 7;
/** Peringatan add-on modul bulanan akan habis. */
export const MODULE_ADDON_EXPIRING_SOON_DAYS = 7;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function isExpired(expiry: Date | null | undefined, now = Date.now()): boolean {
  if (!expiry) return false;
  return expiry.getTime() <= now;
}

/** Fase langganan tanpa mutasi DB (sync). */
export function resolveSubscriptionPhase(
  village: SubscriptionStatusSummary,
  now = Date.now(),
): SubscriptionPhase {
  const status = String(village.subscriptionStatus ?? "").toLowerCase();
  const expiry = village.subscriptionExpiry;

  if (status === "inactive" || status === "cancelled") return "inactive";

  if (status === "active") {
    if (isExpired(expiry, now)) return "inactive";
    return "active";
  }

  if (status === "trial") {
    if (isExpired(expiry, now)) return "grace";
    return "trial";
  }

  if (status === "grace") {
    if (isExpired(expiry, now)) return "inactive";
    return "grace";
  }

  return "inactive";
}

export function isVillageSubscriptionReadable(
  village: SubscriptionStatusSummary,
  now = Date.now(),
): boolean {
  const phase = resolveSubscriptionPhase(village, now);
  return phase === "trial" || phase === "grace" || phase === "active";
}

export function isVillageSubscriptionWritable(
  village: SubscriptionStatusSummary,
  now = Date.now(),
): boolean {
  const phase = resolveSubscriptionPhase(village, now);
  return phase === "trial" || phase === "active";
}

/**
 * Backward-compatible: readable for GET/HEAD/OPTIONS, writable for mutations.
 * Without method → readable (UI status checks).
 */
export function isVillageSubscriptionActive(
  village: SubscriptionStatusSummary,
  method?: string,
  now = Date.now(),
): boolean {
  const m = method?.toUpperCase();
  if (m === "GET" || m === "HEAD" || m === "OPTIONS") {
    return isVillageSubscriptionReadable(village, now);
  }
  if (m) {
    return isVillageSubscriptionWritable(village, now);
  }
  return isVillageSubscriptionReadable(village, now);
}

/** Paid subscription active (not trial/grace). */
export function isVillagePaidSubscriptionActive(
  village: SubscriptionStatusSummary,
  now = Date.now(),
): boolean {
  const status = String(village.subscriptionStatus ?? "").toLowerCase();
  if (status !== "active") return false;
  if (isExpired(village.subscriptionExpiry, now)) return false;
  return true;
}

export function getSubscriptionDaysRemaining(
  village: SubscriptionStatusSummary,
  now = Date.now(),
): number | null {
  const expiry = village.subscriptionExpiry;
  if (!expiry) return null;
  const diff = expiry.getTime() - now;
  if (diff <= 0) return 0;
  return Math.ceil(diff / MS_PER_DAY);
}

export type SubscriptionPhaseInfo = {
  phase: SubscriptionPhase;
  readable: boolean;
  writable: boolean;
  daysRemaining: number | null;
  status: string;
  expiry: string | null;
};

export function getSubscriptionPhaseInfo(
  village: SubscriptionStatusSummary,
  now = Date.now(),
): SubscriptionPhaseInfo {
  const phase = resolveSubscriptionPhase(village, now);
  return {
    phase,
    readable: phase === "trial" || phase === "grace" || phase === "active",
    writable: phase === "trial" || phase === "active",
    daysRemaining: getSubscriptionDaysRemaining(village, now),
    status: String(village.subscriptionStatus ?? "").toLowerCase(),
    expiry: village.subscriptionExpiry?.toISOString() ?? null,
  };
}

/** Lazy transition trial→grace→inactive in DB. */
export async function resolveSubscriptionPhaseWithTransition(
  villageId: number,
  village: SubscriptionStatusSummary,
): Promise<SubscriptionPhase> {
  const now = new Date();
  const status = String(village.subscriptionStatus ?? "").toLowerCase();
  const expiry = village.subscriptionExpiry;

  if (status === "trial" && expiry && expiry.getTime() <= now.getTime()) {
    const graceExpiry = new Date(now.getTime() + GRACE_DAYS * MS_PER_DAY);
    await prisma.village.update({
      where: { id: villageId },
      data: { subscriptionStatus: "grace", subscriptionExpiry: graceExpiry },
    });
    return "grace";
  }

  if (status === "grace" && expiry && expiry.getTime() <= now.getTime()) {
    await prisma.village.update({
      where: { id: villageId },
      data: { subscriptionStatus: "inactive", subscriptionExpiry: null },
    });
    return "inactive";
  }

  if (status === "active" && expiry && expiry.getTime() <= now.getTime()) {
    await prisma.village.update({
      where: { id: villageId },
      data: { subscriptionStatus: "inactive" },
    });
    return "inactive";
  }

  return resolveSubscriptionPhase(village);
}

const SUBSCRIPTION_EXEMPT_PREFIXES = [
  "/api/billing",
  "/api/village/onboarding",
  "/api/auth",
];

export function isSubscriptionExemptPath(pathname: string): boolean {
  return SUBSCRIPTION_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p));
}

export function subscriptionBlockedResponse(village?: SubscriptionStatusSummary) {
  const status = String(village?.subscriptionStatus ?? "").toLowerCase() || null;
  const expiry = village?.subscriptionExpiry ? village.subscriptionExpiry.toISOString() : null;
  const phase = village ? resolveSubscriptionPhase(village) : "inactive";
  return NextResponse.json(
    {
      error: "Langganan belum aktif. Silakan lakukan pembayaran untuk mengaktifkan fitur ini.",
      code: "SUBSCRIPTION_INACTIVE",
      subscription: { status, expiry, phase },
      billingUrl: "/billing",
    },
    { status: 402 },
  );
}

export function subscriptionReadOnlyResponse(village?: SubscriptionStatusSummary) {
  const info = village ? getSubscriptionPhaseInfo(village) : null;
  return NextResponse.json(
    {
      error:
        "Masa trial/grace dalam mode baca saja. Aktifkan paket untuk menambah atau mengubah data.",
      code: "SUBSCRIPTION_READ_ONLY",
      subscription: info,
      billingUrl: "/billing",
    },
    { status: 403 },
  );
}

export function assertSubscriptionForMethod(
  village: SubscriptionStatusSummary,
  method: string,
): NextResponse | null {
  const m = method.toUpperCase();
  if (m === "GET" || m === "HEAD" || m === "OPTIONS") {
    if (!isVillageSubscriptionReadable(village)) {
      return subscriptionBlockedResponse(village);
    }
    return null;
  }
  if (!isVillageSubscriptionReadable(village)) {
    return subscriptionBlockedResponse(village);
  }
  if (!isVillageSubscriptionWritable(village)) {
    return subscriptionReadOnlyResponse(village);
  }
  return null;
}
