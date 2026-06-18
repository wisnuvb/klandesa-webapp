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
  onOpenCheckout: (tier: DesaPackageTier) => void;
  checkoutLoading: boolean;
};

export function TierCard({
  tier,
  currentPlan,
  subscriptionPaid,
  subscriptionPhase,
  onOpenCheckout,
  checkoutLoading,
}: TierCardProps) {
  const tierInfo = BILLING_CATALOG.desa_package.tiers[tier];
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
