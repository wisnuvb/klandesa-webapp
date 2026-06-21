"use client";

import Link from "next/link";
import { AlertTriangle, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SUBSCRIPTION_EXPIRING_SOON_DAYS,
  SUBSCRIPTION_EXPIRING_URGENT_DAYS,
} from "@/lib/subscription";

type TrialBannerProps = {
  phase: string;
  daysRemaining: number | null;
  writable: boolean;
  expiringSoon?: boolean;
};

export function TrialBanner({
  phase,
  daysRemaining,
  writable,
  expiringSoon = false,
}: TrialBannerProps) {
  if (phase === "inactive") return null;

  const days = daysRemaining ?? 0;

  if (phase === "grace") {
    return (
      <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-sm text-red-900">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Mode baca saja — trial berakhir. {days > 0 ? `${days} hari` : "Segera"}{" "}
            sebelum akun terkunci penuh.
          </span>
        </div>
        <Button size="sm" variant="destructive" asChild>
          <Link href="/billing">Aktifkan Paket</Link>
        </Button>
      </div>
    );
  }

  if (phase === "trial") {
    const urgent = days <= 7;
    return (
      <div
        className={
          urgent
            ? "bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-900"
            : "bg-sky-50 border-b border-sky-200 px-4 py-2 text-sm text-sky-900"
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {urgent ? (
              <Clock className="h-4 w-4 shrink-0" />
            ) : (
              <Sparkles className="h-4 w-4 shrink-0" />
            )}
            <span>
              Trial Profesional — <strong>{days} hari</strong> tersisa
              {!writable ? " (baca saja)" : ""}
            </span>
          </div>
          {urgent ? (
            <Button size="sm" variant="outline" asChild>
              <Link href="/billing">Aktifkan Sekarang</Link>
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="bg-background/60" asChild>
              <Link href="/asisten-ai">Coba Laras</Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (
    phase === "active" &&
    expiringSoon &&
    daysRemaining != null &&
    daysRemaining <= SUBSCRIPTION_EXPIRING_SOON_DAYS
  ) {
    const urgent = daysRemaining <= SUBSCRIPTION_EXPIRING_URGENT_DAYS;
    return (
      <div
        className={
          urgent
            ? "bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-900"
            : "bg-sky-50 border-b border-sky-200 px-4 py-2 text-sm text-sky-900"
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {urgent ? (
              <Clock className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            <span>
              Paket langganan berakhir{" "}
              <strong>
                {days === 0 ? "hari ini" : `dalam ${days} hari`}
              </strong>
              . Perpanjang agar layanan desa tetap aktif.
            </span>
          </div>
          <Button size="sm" variant={urgent ? "default" : "outline"} asChild>
            <Link href="/billing">Perpanjang Paket</Link>
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
