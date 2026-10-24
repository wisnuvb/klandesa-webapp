"use client";

import Link from "next/link";
import { AlertTriangle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface ResourceLimitBannerProps {
  /** Current usage count */
  current: number;
  /** Maximum allowed for current plan */
  limit: number;
  /** Label for the resource (e.g. "transaksi", "dasawisma") */
  resourceLabel: string;
  /** Module ID for billing link */
  moduleId: string;
  /** Whether current count exceeds limit (data is hidden) */
  isOverLimit?: boolean;
  /** Number of hidden records when over limit */
  hiddenCount?: number;
}

export function ResourceLimitBanner({
  current,
  limit,
  resourceLabel,
  moduleId,
  isOverLimit,
  hiddenCount,
}: ResourceLimitBannerProps) {
  const percentage = Math.min((current / limit) * 100, 100);
  const nearLimit = percentage >= 80;

  return (
    <div
      className={`rounded-lg border p-3 text-sm ${
        isOverLimit
          ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800"
          : nearLimit
          ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
          : "bg-muted/50 border-border"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {(isOverLimit || nearLimit) && (
            <AlertTriangle
              className={`h-4 w-4 shrink-0 ${isOverLimit ? "text-red-500" : "text-amber-500"}`}
            />
          )}
          <div className="min-w-0">
            <p
              className={`font-medium ${
                isOverLimit
                  ? "text-red-700 dark:text-red-400"
                  : nearLimit
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-foreground"
              }`}
            >
              {isOverLimit
                ? `Limit tercapai — ${hiddenCount} ${resourceLabel} tersembunyi`
                : `${current} / ${limit} ${resourceLabel}`}
            </p>
            {!isOverLimit && (
              <Progress value={percentage} className="mt-1 h-1.5 w-40" />
            )}
          </div>
        </div>
        <Button size="sm" variant="outline" className="shrink-0 gap-1.5" asChild>
          <Link href={`/billing?module=${moduleId}`}>
            <Zap className="h-3.5 w-3.5" />
            Full Access
          </Link>
        </Button>
      </div>
    </div>
  );
}
