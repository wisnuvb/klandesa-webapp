"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "./AppShell";

/**
 * Rute /auth/* tidak memakai AppShell agar halaman login tidak tertutup sidebar/header.
 * Guard auth: DIMATIKAN untuk debugging.
 */
export function AppLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthRoute = pathname?.startsWith("/auth") ?? false;

  if (isAuthRoute) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}
