import { NextResponse } from "next/server";

export type SubscriptionStatusSummary = {
  subscriptionStatus?: string | null;
  subscriptionExpiry?: Date | null;
};

export function isVillageSubscriptionActive(village: SubscriptionStatusSummary): boolean {
  const status = String(village.subscriptionStatus ?? "").toLowerCase();
  if (status !== "active") return false;
  if (!village.subscriptionExpiry) return true;
  return village.subscriptionExpiry.getTime() > Date.now();
}

export function subscriptionBlockedResponse(village?: SubscriptionStatusSummary) {
  const status = String(village?.subscriptionStatus ?? "").toLowerCase() || null;
  const expiry = village?.subscriptionExpiry ? village.subscriptionExpiry.toISOString() : null;
  return NextResponse.json(
    {
      error: "Langganan belum aktif. Silakan lakukan pembayaran untuk mengaktifkan fitur.",
      code: "SUBSCRIPTION_INACTIVE",
      subscription: { status, expiry },
      billingUrl: "/billing",
    },
    { status: 402 }
  );
}

