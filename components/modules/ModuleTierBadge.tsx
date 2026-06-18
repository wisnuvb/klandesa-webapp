import { cn } from "@/components/ui/utils";
import type { PackageTier } from "@/lib/modules/entitlements";

const TIER_STYLES: Record<
  PackageTier,
  { label: string; className: string }
> = {
  starter: {
    label: "Starter",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
  profesional: {
    label: "Profesional",
    className: "bg-sky-100 text-sky-800 border-sky-200",
  },
  enterprise: {
    label: "Enterprise",
    className: "bg-amber-100 text-amber-900 border-amber-200",
  },
};

type ModuleTierBadgeProps = {
  tier: PackageTier;
  size?: "sm" | "md";
  locked?: boolean;
  addon?: boolean;
  className?: string;
};

export function ModuleTierBadge({
  tier,
  size = "sm",
  locked,
  addon,
  className,
}: ModuleTierBadgeProps) {
  const style = TIER_STYLES[tier];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
        addon ? "bg-violet-100 text-violet-800 border-violet-200" : style.className,
        className,
      )}
    >
      {addon ? "Add-on" : style.label}
      {locked ? " · Terkunci" : null}
    </span>
  );
}

export function tierLabel(tier: PackageTier): string {
  return TIER_STYLES[tier].label;
}
