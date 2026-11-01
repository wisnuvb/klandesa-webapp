import type { NextResponse } from "next/server";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";

type Village = Parameters<typeof isVillageSubscriptionActive>[0];

/** Null bila langganan desa aktif; selain itu jawaban penolakan yang siap dikembalikan. */
export function isSubscriptionBlocked(village: Village): NextResponse | null {
  return isVillageSubscriptionActive(village) ? null : subscriptionBlockedResponse(village);
}
