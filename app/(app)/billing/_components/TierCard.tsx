import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BILLING_CATALOG,
  formatIdr,
  type DesaPackageTier,
} from "@/lib/billing/catalog";

type TierCardProps = {
  tier: DesaPackageTier;
  currentPlan: string | null;
  subscriptionPaid: boolean;
  subscriptionPhase?: string | null;
  /** Dari server: pernah membayar Paket Lengkap. Trial berpaket "lengkap" bukan pembelian. */
  hasPurchasedLengkap?: boolean;
  onOpenCheckout: (tier: DesaPackageTier, months?: number) => void;
  checkoutLoading: boolean;
};

const RENEWAL_MONTHS = [1, 3, 6, 12] as const;

export function TierCard({
  tier,
  currentPlan,
  subscriptionPaid,
  subscriptionPhase,
  hasPurchasedLengkap,
  onOpenCheckout,
  checkoutLoading,
}: TierCardProps) {
  const tierInfo = BILLING_CATALOG.desa_package.tiers[tier];
  const [months, setMonths] = useState<number>(12);

  if (tier === "lengkap") {
    const wasLengkap = hasPurchasedLengkap ?? currentPlan?.toLowerCase() === "lengkap";
    const active = subscriptionPaid && wasLengkap;
    const monthly = BILLING_CATALOG.desa_package.tiers.lengkap.monthlyFee;
    return (
      <div className="rounded-lg border p-4 space-y-2 md:col-span-3">
        <div className="flex items-center justify-between">
          <div className="font-medium">{tierInfo.name}</div>
          {active && <Badge variant="default">Aktif</Badge>}
        </div>
        {wasLengkap ? (
          <>
            <div className="text-sm text-muted-foreground">
              Perpanjangan {formatIdr(monthly)}/bulan. Sisa masa berlaku tidak hangus.
            </div>
            <label className="flex items-center gap-2 text-sm">
              Perpanjang
              <select
                className="rounded-md border bg-background px-2 py-1"
                value={months}
                onChange={(e) => setMonths(Number(e.target.value))}
                aria-label="Lama perpanjangan"
              >
                {RENEWAL_MONTHS.map((m) => (
                  <option key={m} value={m}>{m} bulan</option>
                ))}
              </select>
            </label>
            <div className="text-sm font-medium text-green-600">Total: {formatIdr(monthly * months)}</div>
          </>
        ) : (
          <>
            <div className="text-sm text-muted-foreground">
              Biaya awal {formatIdr(tierInfo.setupFee ?? 0)} sudah termasuk 12 bulan pertama. Mulai tahun ke-2: {formatIdr(monthly)}/bulan.
            </div>
            <div className="text-sm font-medium text-green-600">Total: {formatIdr(tierInfo.setupFee ?? 0)}</div>
          </>
        )}
        <Button onClick={() => onOpenCheckout(tier, wasLengkap ? months : undefined)} disabled={checkoutLoading} variant={active ? "outline" : "default"}>
          {wasLengkap ? "Perpanjang" : "Berlangganan"}
        </Button>
      </div>
    );
  }

  const planMatches =
    currentPlan?.toLowerCase() === tier.toLowerCase();
  const isCurrentPlan = subscriptionPaid && planMatches;
  const isTrialPlan =
    !subscriptionPaid &&
    planMatches &&
    (subscriptionPhase === "trial" || subscriptionPhase === "grace");

  const isUpgrade = subscriptionPaid && !planMatches;
  const needsSetupFee = !subscriptionPaid || isUpgrade;

  const totalAmount =
    needsSetupFee && tierInfo.setupFee != null
      ? tierInfo.setupFee
      : tierInfo.annualFee;

  const actionLabel = (() => {
    if (subscriptionPaid && isCurrentPlan) return "Perpanjang";
    if (subscriptionPaid) return "Upgrade";
    if (subscriptionPhase === "trial" || subscriptionPhase === "grace") {
      return "Upgrade";
    }
    return "Berlangganan";
  })();

  return (
    <div className="rounded-lg border p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-medium">{tierInfo.name}</div>
        {isCurrentPlan && (
          <Badge variant="default">Aktif</Badge>
        )}
        {isTrialPlan && (
          <Badge variant="secondary">Trial</Badge>
        )}
      </div>
      <div className="text-sm text-muted-foreground">
        {needsSetupFee ? (
          isUpgrade ? (
            <>Biaya upgrade: {formatIdr(tierInfo.setupFee || 0)}</>
          ) : (
            <>Biaya awal: {formatIdr(tierInfo.setupFee || 0)}</>
          )
        ) : (
          <>Tahunan: {formatIdr(tierInfo.annualFee)}</>
        )}
      </div>
      <div className="text-sm font-medium text-green-600">
        Total: {formatIdr(totalAmount)}
      </div>
      <Button
        onClick={() => onOpenCheckout(tier)}
        disabled={checkoutLoading}
        variant={isCurrentPlan ? "outline" : "default"}
      >
        {actionLabel}
      </Button>
    </div>
  );
}
