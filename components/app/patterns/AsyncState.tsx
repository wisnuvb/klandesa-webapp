"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loader2, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModuleTierBadge } from "@/components/modules/ModuleTierBadge";
import {
  normalizeAsyncError,
  type AsyncPageError,
  type ModuleNotEntitledInfo,
} from "@/lib/modules/client-error";
import { getModuleById } from "@/lib/modules/registry";
import { formatIdr } from "@/lib/billing/catalog";

type AsyncStateProps = {
  loading?: boolean;
  error?: AsyncPageError | null;
  empty?: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
  emptyTitle?: string;
  onRetry?: () => void;
  minHeight?: string;
  children: ReactNode;
};

function resolveBillingUrl(
  info: ModuleNotEntitledInfo,
  pathname: string | null,
): string {
  if (info.billingUrl) return info.billingUrl;

  if (info.module) {
    return `/billing?module=${encodeURIComponent(info.module)}`;
  }

  const mod = getModuleById(
    pathname?.replace(/^\//, "").split("/")[0] ?? "",
  );
  if (mod) {
    return `/billing?module=${encodeURIComponent(mod.id)}`;
  }

  return "/billing";
}

function ModuleNotEntitledPanel({
  info,
  minHeight,
}: {
  info: ModuleNotEntitledInfo;
  minHeight: string;
}) {
  const pathname = usePathname();
  const billingUrl = resolveBillingUrl(info, pathname);
  const mod = info.module ? getModuleById(info.module) : undefined;

  return (
    <div
      className="flex items-center justify-center px-4"
      style={{ minHeight }}
    >
      <div className="max-w-md text-center space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <Lock className="h-7 w-7" aria-hidden />
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">
            {mod ? `${mod.label} belum aktif` : "Modul belum aktif"}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {info.message}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {info.requiredTier ? (
            <ModuleTierBadge tier={info.requiredTier} locked />
          ) : null}
          {info.addonMonthlyFee != null ? (
            <span className="text-xs text-muted-foreground">
              atau langganan add-on {formatIdr(info.addonMonthlyFee)}/bulan
            </span>
          ) : null}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-1">
          <Button asChild>
            <Link href={billingUrl}>
              Kelola Langganan
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/harga">Lihat Perbandingan Paket</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function GenericErrorPanel({
  error,
  onRetry,
  minHeight,
}: {
  error: string;
  onRetry?: () => void;
  minHeight: string;
}) {
  return (
    <div
      className="flex items-center justify-center px-4"
      style={{ minHeight }}
    >
      <div className="text-center space-y-4 max-w-md">
        <div className="text-destructive text-4xl mb-2">!</div>
        <h3 className="text-lg font-semibold">Gagal memuat data</h3>
        <p className="text-muted-foreground text-sm">{error}</p>
        {onRetry ? <Button onClick={onRetry}>Coba Lagi</Button> : null}
      </div>
    </div>
  );
}

export function AsyncState({
  loading = false,
  error = null,
  empty = false,
  loadingMessage = "Memuat data...",
  emptyMessage = "Belum ada data",
  emptyTitle = "Data kosong",
  onRetry,
  minHeight = "70vh",
  children,
}: AsyncStateProps) {
  const normalizedError = error ? normalizeAsyncError(error) : null;

  if (loading) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ minHeight }}
      >
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  if (normalizedError) {
    if (
      typeof normalizedError === "object" &&
      normalizedError.code === "MODULE_NOT_ENTITLED"
    ) {
      return (
        <ModuleNotEntitledPanel info={normalizedError} minHeight={minHeight} />
      );
    }

    return (
      <GenericErrorPanel
        error={
          typeof normalizedError === "string"
            ? normalizedError
            : normalizedError.message
        }
        onRetry={onRetry}
        minHeight={minHeight}
      />
    );
  }

  if (empty) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ minHeight: "40vh" }}
      >
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">{emptyTitle}</h3>
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
