import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { INVOKE_PATHNAME_HEADER } from "@/lib/middleware-headers";
import { isRegionalAccount } from "@/lib/regional-session";
import { isPartnerAccount, hasPartnerPortalAccess } from "@/lib/partner-session";
import { isPlatformAccount } from "@/lib/platform-session";
import { getAppBuildId } from "@/lib/build-id";
import { prisma } from "@/lib/prisma";
import { getModuleByPathSegment } from "@/lib/modules/registry";
import { roleCan, type PermissionActor } from "@/lib/permissions";
import { PermissionsProvider } from "@/components/permissions/PermissionsProvider";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { AppLayoutClient } from "./AppLayoutClient";
import type { Metadata } from "next";

/** Rute dashboard using auth + DB; don't make it static at build (without DB connection). */
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

interface AppLayoutProps {
  children: React.ReactNode;
}

async function AppLayoutContent({ children }: AppLayoutProps) {
  const headersList = await headers();
  const pathname = headersList.get(INVOKE_PATHNAME_HEADER) || "/";
  const isAuthRoute = pathname.startsWith("/auth");
  const buildId = getAppBuildId();

  if (isAuthRoute) {
    return <AppLayoutClient buildId={buildId}>{children}</AppLayoutClient>;
  }

  const session = await auth();
  if (!session?.user?.id) {
    const safePath = pathname.startsWith("/") ? pathname : `/${pathname}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(safePath)}`);
  }

  const isWilayah = pathname.startsWith("/wilayah");
  const isMitra = pathname.startsWith("/mitra");
  const isAdmin = pathname.startsWith("/admin");
  if (isPlatformAccount(session)) {
    if (!isAdmin) {
      redirect("/admin");
    }
    return <AppLayoutClient buildId={buildId}>{children}</AppLayoutClient>;
  }
  if (isRegionalAccount(session)) {
    if (isAdmin || !isWilayah) {
      redirect("/wilayah");
    }
  } else if (isPartnerAccount(session)) {
    if (isAdmin || !isMitra) {
      redirect("/mitra");
    }
  } else {
    if (isWilayah || isAdmin) {
      redirect("/dashboard");
    }
    if (isMitra && !hasPartnerPortalAccess(session)) {
      redirect("/dashboard");
    }
  }

  // Akun desa: role & penyesuaian izin diambil dari DB (bukan JWT) agar perubahan Admin langsung terlihat.
  let actor: PermissionActor | null = null;
  const uid = Number.parseInt(String(session.user.id), 10);
  const isVillageAccount =
    !isRegionalAccount(session) && !isPartnerAccount(session) && Number.isFinite(uid) && /^\d+$/.test(String(session.user.id));
  if (isVillageAccount) {
    const row = await prisma.user
      .findUnique({ where: { id: uid }, select: { role: true, permissionOverrides: true } })
      .catch(() => null);
    if (row) {
      actor = { role: row.role, permissionOverrides: row.permissionOverrides };
      // Muat penuh/tautan langsung ke modul tanpa izin Lihat: kembali ke beranda. (Navigasi sisi klien dijaga PageAccessGuard.)
      const segment = pathname.split("/").filter(Boolean)[0] ?? "";
      const mod = segment && segment !== "dashboard" ? getModuleByPathSegment(segment) : undefined;
      if (mod && !roleCan(mod.permission, "read", actor)) {
        redirect("/dashboard?akses=ditolak");
      }
    }
  }

  return (
    <PermissionsProvider actor={actor}>
      <AppLayoutClient buildId={buildId}>{children}</AppLayoutClient>
    </PermissionsProvider>
  );
}

/** Google Analytics hanya dimuat di grup rute (app), bukan di landing/website/kiosk. */
export default async function AppLayout({ children }: AppLayoutProps) {
  return (
    <>
      <AppLayoutContent>{children}</AppLayoutContent>
      <GoogleAnalytics />
    </>
  );
}
