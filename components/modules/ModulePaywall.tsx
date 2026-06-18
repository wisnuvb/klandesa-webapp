"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleTierBadge } from "@/components/modules/ModuleTierBadge";
import { formatIdr } from "@/lib/billing/catalog";
import type { PackageTier } from "@/lib/modules/entitlements";

type ModulePaywallProps = {
  moduleLabel: string;
  minPackageTier: PackageTier;
  addonMonthlyFee?: number | null;
  moduleId: string;
};

export function ModulePaywall({
  moduleLabel,
  minPackageTier,
  addonMonthlyFee,
  moduleId,
}: ModulePaywallProps) {
  return (
    <div className="flex items-center justify-center min-h-[50vh] p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle>{moduleLabel}</CardTitle>
          <CardDescription>
            Modul ini memerlukan paket{" "}
            <ModuleTierBadge tier={minPackageTier} size="md" />
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {addonMonthlyFee != null && (
            <p className="text-sm text-muted-foreground">
              Atau aktifkan add-on bulanan mulai {formatIdr(addonMonthlyFee)}/bulan
            </p>
          )}
          <Button asChild>
            <Link href={`/billing?module=${encodeURIComponent(moduleId)}`}>
              Lihat opsi langganan
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
