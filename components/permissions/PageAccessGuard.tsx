"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getModuleByPathSegment } from "@/lib/modules/registry";
import { roleCan } from "@/lib/permissions/client";
import PageSkeleton from "@/components/layout/PageSkeleton";
import { useEffectiveActor, usePermissionsLoaded } from "./PermissionsProvider";

/** Halaman yang selalu boleh dibuka (tujuan pengalihan dan beranda). */
const ALWAYS_ALLOWED = new Set(["", "dashboard", "profil", "bantuan", "onboarding"]);

/**
 * Menutup halaman modul yang izin "Lihat"-nya tidak dimiliki akun, termasuk saat pindah halaman tanpa muat ulang.
 * Hanya UX; data tetap dijaga API (403). Halaman SERVER yang membaca DB langsung punya penjaga sendiri
 * (lib/permissions/server-page-guard.ts).
 */
export function PageAccessGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const actor = useEffectiveActor();
  const loaded = usePermissionsLoaded();
  const denied = useSearchParams()?.get("akses") === "ditolak";
  const segment = pathname.split("/").filter(Boolean)[0] ?? "";

  // Izin masih dimuat: tahan konten modul dengan kerangka (tanpa lonjakan tata letak) supaya halaman yang
  // ternyata terlarang tidak sempat tampil sekejap. Beranda/profil dkk. tidak perlu menunggu.
  if (!loaded && !ALWAYS_ALLOWED.has(segment) && getModuleByPathSegment(segment)) return <PageSkeleton />;

  if (!actor || ALWAYS_ALLOWED.has(segment)) {
    return (
      <>
        {denied && segment === "dashboard" && (
          <p role="alert" className="mb-4 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Akun Anda belum punya akses ke halaman yang Anda tuju. Hubungi Admin Desa bila memerlukannya.
          </p>
        )}
        {children}
      </>
    );
  }
  const mod = getModuleByPathSegment(segment);
  if (!mod || roleCan(mod.permission, "read", actor)) return <>{children}</>;

  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <ShieldAlert className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
      <h1 className="text-xl font-semibold">Anda belum punya akses ke halaman ini</h1>
      <p className="text-sm text-muted-foreground">
        Akun Anda belum diberi izin untuk modul <strong>{mod.label}</strong>. Hubungi Admin Desa bila Anda memerlukannya.
      </p>
      <Button asChild className="h-11">
        <Link href="/dashboard">Kembali ke beranda</Link>
      </Button>
    </div>
  );
}
