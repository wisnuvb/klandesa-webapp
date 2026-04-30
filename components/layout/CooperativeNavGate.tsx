"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCooperativeNav } from "@/components/providers/CooperativeNavProvider";

const ALLOWED_PREFIXES = [
  "/koperasi",
  "/profil",
  "/billing",
  "/auth",
] as const;

function isAllowedPath(pathname: string): boolean {
  if (!pathname) return true;
  for (const prefix of ALLOWED_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return true;
    }
  }
  return false;
}

/**
 * Pengurus/manager cooperative (role staff) not allowed to access desa dashboard via URL;
 * redirect to /cooperative.
 */
export function CooperativeNavGate() {
  const pathname = usePathname();
  const router = useRouter();
  const { access, loading } = useCooperativeNav();

  useEffect(() => {
    if (loading) return;
    if (!access?.cooperativeOnlyNav) return;
    const p = pathname ?? "";
    if (isAllowedPath(p)) return;
    router.replace("/koperasi");
  }, [loading, access?.cooperativeOnlyNav, pathname, router]);

  return null;
}
