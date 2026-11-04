"use client";

import { Suspense, useEffect, useLayoutEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { RegionalAppShell } from "@/components/layout/RegionalAppShell";
import { CooperativeNavGate } from "@/components/layout/CooperativeNavGate";
import { CooperativeNavProvider } from "@/components/providers/CooperativeNavProvider";
import { AppDialogProvider } from "@/components/providers/AppDialogProvider";
import { PaymentProvider } from "@/components/billing/PaymentProvider";
import PageSkeleton from "@/components/layout/PageSkeleton";
import { RemotePermissionsProvider } from "@/components/permissions/PermissionsProvider";
import { PageAccessGuard } from "@/components/permissions/PageAccessGuard";
import { isRegionalAccount } from "@/lib/regional-session";
import { isPartnerAccount } from "@/lib/partner-session";
import { isPlatformAccount } from "@/lib/platform-session";
import { resolveAreaRedirect, signInUrl } from "@/lib/auth/area-redirect";
import { fetchJsonDeduped, setFetchCacheScope } from "@/lib/client/fetch-cache";
import { AppShell } from "./AppShell";

/**
 * Gerbang shell dashboard. Layout server (app)/layout.tsx sekarang STATIS (tanpa auth()/query DB per muat),
 * jadi sesi dan area akun dicek di sini: belum masuk -> halaman masuk; akun di area yang salah -> area yang benar.
 * Selama sesi belum diketahui atau pengalihan berjalan, hanya kerangka yang tampil (konten halaman tidak dirender),
 * sehingga halaman tidak sempat berkedip sebelum dialihkan. Data tetap dijaga setiap API (401/403).
 *
 * Route /auth/* tidak memakai shell agar halaman masuk tidak tertutup sidebar/header.
 */
export function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { data: session, status } = useSession();

  const isAuthRoute = pathname.startsWith("/auth");

  // Identitas sesi (jenis akun + id) menjadi "scope" cache klien. Berubah (login/logout/ganti akun) -> cache & dedupe
  // dikosongkan. Layout effect (bukan useEffect) agar jalan SEBELUM effect pemuat data milik anak pada commit yang sama,
  // jadi tidak ada fetch akun baru yang membaca cache akun lama. Belum masuk/memuat -> scope kosong.
  const sessionUser = session?.user as { id?: string; accountType?: string } | undefined;
  const cacheScope =
    status === "authenticated" && sessionUser?.id ? `${sessionUser.accountType ?? "village"}:${sessionUser.id}` : "";
  useLayoutEffect(() => {
    setFetchCacheScope(cacheScope);
  }, [cacheScope]);

  const redirectTo =
    isAuthRoute || status === "loading"
      ? null
      : status === "unauthenticated"
        ? signInUrl(pathname)
        : resolveAreaRedirect(session, pathname);

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  if (isAuthRoute) return <>{children}</>;
  if (status === "loading" || redirectTo) return <GateSkeleton />;

  return <AuthedFrame pathname={pathname}>{children}</AuthedFrame>;
}

function GateSkeleton() {
  return (
    <div className="min-h-dvh bg-background p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <PageSkeleton />
      </div>
    </div>
  );
}

/** Build ID server saat halaman ini dimuat (basis pembanding pemberitahuan pembaruan). "dev" = tidak ada pembandingan. */
function useBuildId(): string {
  const [buildId, setBuildId] = useState("dev");
  useEffect(() => {
    let alive = true;
    // Lewat util dedupe; UpdateAvailableNotice memakai build id ini sebagai basis dan tidak meminta ulang saat muat.
    fetchJsonDeduped<{ buildId?: string }>("/api/app-build-id")
      .then((r) => (r.ok ? r.body : null))
      .then((d) => {
        if (alive && d?.buildId) setBuildId(d.buildId);
      })
      .catch(() => {
        /* pengecekan latar belakang: diam */
      });
    return () => {
      alive = false;
    };
  }, []);
  return buildId;
}

function AuthedFrame({ pathname, children }: { pathname: string; children: React.ReactNode }) {
  const { data: session } = useSession();
  const buildId = useBuildId();
  const isWilayah = pathname.startsWith("/wilayah");

  // Izin per akun hanya relevan untuk akun desa (id numerik); akun regional/mitra/platform punya shell & API sendiri.
  const isVillageAccount =
    !!session &&
    !isRegionalAccount(session) &&
    !isPartnerAccount(session) &&
    !isPlatformAccount(session) &&
    /^\d+$/.test(String(session.user?.id ?? ""));

  return (
    <AppDialogProvider>
      <PaymentProvider>
        <RemotePermissionsProvider enabled={isVillageAccount}>
          {isWilayah ? (
            <RegionalAppShell>{children}</RegionalAppShell>
          ) : (
            <CooperativeNavProvider>
              <CooperativeNavGate />
              <AppShell buildId={buildId}>
                {/* useSearchParams di PageAccessGuard butuh batas Suspense agar shell bisa diprarender statis. */}
                <Suspense fallback={<PageSkeleton />}>
                  <PageAccessGuard>{children}</PageAccessGuard>
                </Suspense>
              </AppShell>
            </CooperativeNavProvider>
          )}
        </RemotePermissionsProvider>
      </PaymentProvider>
    </AppDialogProvider>
  );
}
