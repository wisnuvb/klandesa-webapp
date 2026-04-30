"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { RegionalAppShell } from "@/components/layout/RegionalAppShell";
import { CooperativeNavGate } from "@/components/layout/CooperativeNavGate";
import { CooperativeNavProvider } from "@/components/providers/CooperativeNavProvider";
import { AppDialogProvider } from "@/components/providers/AppDialogProvider";
import { isRegionalAccount } from "@/lib/regional-session";
import { AppShell } from "./AppShell";

/**
 * Route /auth/* not using AppShell so that the login page is not covered by the sidebar/header.
 * Regional account only using regional shell and redirected from desa route.
 */
export function AppLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

  const isAuthRoute = pathname?.startsWith("/auth") ?? false;
  const isWilayah = pathname?.startsWith("/wilayah") ?? false;

  useEffect(() => {
    if (status !== "authenticated" || !session) return;
    if (isAuthRoute || isWilayah) return;
    if (isRegionalAccount(session)) {
      router.replace("/wilayah");
    }
  }, [status, session, pathname, isAuthRoute, isWilayah, router]);

  if (isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <AppDialogProvider>
      {isWilayah ? (
        <RegionalAppShell>{children}</RegionalAppShell>
      ) : (
        <CooperativeNavProvider>
          <CooperativeNavGate />
          <AppShell>{children}</AppShell>
        </CooperativeNavProvider>
      )}
    </AppDialogProvider>
  );
}
