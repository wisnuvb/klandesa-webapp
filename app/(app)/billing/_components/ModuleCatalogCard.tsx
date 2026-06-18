"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleTierBadge } from "@/components/modules/ModuleTierBadge";
import { formatIdr } from "@/lib/billing/catalog";
import type { PackageTier } from "@/lib/modules/entitlements";
import { getModuleById } from "@/lib/modules/registry";
import { getModuleEntitlement } from "@/lib/modules/entitlements";

export type ModuleCatalogItem = {
  entitled: boolean;
  source: string | null;
  minPackageTier: PackageTier;
  addonMonthlyFee: number | null;
  locked: boolean;
};

type ModuleCatalogCardProps = {
  modules: Record<string, ModuleCatalogItem>;
  onSubscribe: (moduleCode: string) => void;
  checkoutLoading?: string | null;
};

export function ModuleCatalogCard({
  modules,
  onSubscribe,
  checkoutLoading,
}: ModuleCatalogCardProps) {
  const items = Object.entries(modules)
    .filter(([id]) => !["dashboard", "billing", "pengaturan-desa"].includes(id))
    .map(([id, m]) => ({ id, ...m }))
    .filter((m) => m.locked || m.addonMonthlyFee != null)
    .sort((a, b) => a.minPackageTier.localeCompare(b.minPackageTier));

  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modul & Add-on</CardTitle>
        <CardDescription>
          Aktifkan modul di luar paket Anda dengan langganan bulanan
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {items.map((item) => {
            const mod = getModuleById(item.id);
            const label = mod?.label ?? item.id;
            return (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{label}</span>
                    <ModuleTierBadge
                      tier={item.minPackageTier}
                      locked={item.locked}
                    />
                    {item.entitled && !item.locked && (
                      <span className="text-xs text-emerald-600">Aktif</span>
                    )}
                  </div>
                  {item.addonMonthlyFee != null && (
                    <p className="text-sm text-muted-foreground">
                      {formatIdr(item.addonMonthlyFee)}/bulan
                    </p>
                  )}
                </div>
                {item.locked && item.addonMonthlyFee != null && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={checkoutLoading === item.id}
                    onClick={() => {
                      const ent = getModuleEntitlement(item.id);
                      const code =
                        mod?.billingAddon ??
                        ent?.addonProductCode ??
                        item.id.replace(/-/g, "_");
                      onSubscribe(code);
                    }}
                  >
                    {checkoutLoading === item.id ? (
                      "Memproses..."
                    ) : (
                      <>
                        <Lock className="h-3 w-3 mr-1" />
                        Aktifkan
                      </>
                    )}
                  </Button>
                )}
                {item.entitled && item.source === "addon" && (
                  <Button size="sm" variant="ghost" asChild>
                    <Link href={`/${mod?.path?.replace(/^\//, "") ?? item.id}`}>
                      Buka
                    </Link>
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
