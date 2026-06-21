"use client";

import Link from "next/link";
import { Lock, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleTierBadge } from "@/components/modules/ModuleTierBadge";
import { formatIdr } from "@/lib/billing/catalog";
import { MODULE_ADDON_EXPIRING_SOON_DAYS } from "@/lib/subscription";
import type { PackageTier } from "@/lib/modules/entitlements";
import { getModuleById } from "@/lib/modules/registry";
import { getModuleEntitlement } from "@/lib/modules/entitlements";
import type { ModuleActivatePayload } from "../_hooks/useModuleAddonCheckout";

export type ModuleCatalogItem = {
  entitled: boolean;
  source: string | null;
  minPackageTier: PackageTier;
  addonMonthlyFee: number | null;
  locked: boolean;
  addonExpiry?: string | null;
  addonDaysRemaining?: number | null;
};

type ModuleCatalogCardProps = {
  modules: Record<string, ModuleCatalogItem>;
  onActivate: (payload: ModuleActivatePayload) => void;
  checkoutLoading?: string | null;
};

export function ModuleCatalogCard({
  modules,
  onActivate,
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
            const addonExpiringSoon =
              item.source === "addon" &&
              item.addonDaysRemaining != null &&
              item.addonDaysRemaining <= MODULE_ADDON_EXPIRING_SOON_DAYS;

            const activatePayload = () => {
              const ent = getModuleEntitlement(item.id);
              const code =
                mod?.billingAddon ??
                ent?.addonProductCode ??
                item.id.replace(/-/g, "_");
              onActivate({
                moduleId: item.id,
                planCode: code,
                label,
                monthlyFee: item.addonMonthlyFee ?? 0,
              });
            };

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
                      <span
                        className={
                          addonExpiringSoon
                            ? "text-xs text-amber-700 font-medium"
                            : "text-xs text-emerald-600"
                        }
                      >
                        {addonExpiringSoon ? "Akan habis" : "Aktif"}
                      </span>
                    )}
                  </div>
                  {item.addonMonthlyFee != null && (
                    <p className="text-sm text-muted-foreground">
                      {formatIdr(item.addonMonthlyFee)}/bulan
                    </p>
                  )}
                  {item.source === "addon" && item.addonExpiry && (
                    <p
                      className={
                        addonExpiringSoon
                          ? "text-xs text-amber-700 mt-0.5"
                          : "text-xs text-muted-foreground mt-0.5"
                      }
                    >
                      Add-on aktif hingga{" "}
                      {format(new Date(item.addonExpiry), "dd MMM yyyy")}
                      {item.addonDaysRemaining != null
                        ? ` (${item.addonDaysRemaining} hari)`
                        : ""}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                {item.locked && item.addonMonthlyFee != null && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={checkoutLoading === item.id}
                    onClick={activatePayload}
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
                {item.entitled && item.source === "addon" && addonExpiringSoon && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={checkoutLoading === item.id}
                    onClick={activatePayload}
                  >
                    {checkoutLoading === item.id ? (
                      "Memproses..."
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Perpanjang
                      </>
                    )}
                  </Button>
                )}
                {item.entitled && item.source === "addon" && !addonExpiringSoon && (
                  <Button size="sm" variant="ghost" asChild>
                    <Link href={`/${mod?.path?.replace(/^\//, "") ?? item.id}`}>
                      Buka
                    </Link>
                  </Button>
                )}
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
