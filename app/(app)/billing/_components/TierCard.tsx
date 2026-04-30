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
  isActive: boolean;
  onOpenCheckout: (tier: DesaPackageTier) => void;
  checkoutLoading: boolean;
};

export function TierCard({
  tier,
  currentPlan,
  isActive,
  onOpenCheckout,
  checkoutLoading,
}: TierCardProps) {
  const tierInfo = BILLING_CATALOG.desa_package.tiers[tier];
  const isCurrentPlan = currentPlan?.toLowerCase() === tier.toLowerCase();

  const isUpgrade = isActive && !isCurrentPlan;
  const needsSetupFee = !isActive || isUpgrade;

  const totalAmount =
    needsSetupFee && tierInfo.setupFee != null
      ? tierInfo.setupFee
      : tierInfo.annualFee;

  const actionLabel =
    isCurrentPlan && isActive ? "Perpanjang" : !isActive ? "Berlangganan" : "Upgrade";

  return (
    <div className="rounded-lg border p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-medium">{tierInfo.name}</div>
        {isCurrentPlan && (
          <Badge variant={isActive ? "default" : "outline"}>
            {isActive ? "Aktif" : "Tidak Aktif"}
          </Badge>
        )}
      </div>
      <div className="text-sm text-muted-foreground">
        {!isActive ? (
          <>Biaya awal: {formatIdr(tierInfo.setupFee || 0)}</>
        ) : isUpgrade ? (
          <>Biaya upgrade: {formatIdr(tierInfo.setupFee || 0)}</>
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

