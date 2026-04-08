/**
 * @deprecated Prefer `@/lib/payment/linkqu-channels` (`resolveLinkquBankCode`, `validateLinkquCheckoutInput`).
 * Maintained so that old imports do not break if there are any.
 */
import { LINKQU_VA_CHANNELS } from "@/lib/payment/linkqu-channels";
import type { LinkquEwalletRetailCode } from "@/lib/payment/linkqu-channels";
import { LINKQU_EWALLET_CHANNELS } from "@/lib/payment/linkqu-channels";

export const BANK_CODES: Record<string, string> = Object.fromEntries(
  LINKQU_VA_CHANNELS.filter((c) => c.enabled).map((c) => [
    c.id,
    c.linkquBankCode,
  ])
);

export const E_WALLET_RETAIL: Record<string, LinkquEwalletRetailCode> =
  Object.fromEntries(
    LINKQU_EWALLET_CHANNELS.filter((c) => c.enabled).map((c) => [
      c.id,
      c.retailCode,
    ])
  );
