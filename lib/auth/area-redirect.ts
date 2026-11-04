import type { Session } from "next-auth";
import { isPlatformAccount } from "@/lib/platform-session";
import { isRegionalAccount } from "@/lib/regional-session";
import { isPartnerAccount, hasPartnerPortalAccess } from "@/lib/partner-session";

/**
 * Aturan "jenis akun mana boleh membuka area mana" (/admin, /wilayah, /mitra, selain itu = aplikasi desa).
 * Dulu tertanam di layout server (app)/layout.tsx; dipindah ke fungsi murni ini agar layout bisa statis dan aturan
 * yang sama dipakai di klien (gerbang shell) serta server (halaman yang membaca DB langsung). Hanya UX/pengalihan:
 * penegakan data tetap di API.
 *
 * @returns path tujuan pengalihan, atau null bila akun boleh tetap di `pathname`.
 */
export function resolveAreaRedirect(session: Session | null, pathname: string): string | null {
  const isWilayah = pathname.startsWith("/wilayah");
  const isMitra = pathname.startsWith("/mitra");
  const isAdmin = pathname.startsWith("/admin");

  if (isPlatformAccount(session)) return isAdmin ? null : "/admin";
  if (isRegionalAccount(session)) return isAdmin || !isWilayah ? "/wilayah" : null;
  if (isPartnerAccount(session)) return isAdmin || !isMitra ? "/mitra" : null;

  // Akun desa
  if (isWilayah || isAdmin) return "/dashboard";
  if (isMitra && !hasPartnerPortalAccess(session)) return "/dashboard";
  return null;
}

/** URL halaman masuk dengan tujuan kembali (callbackUrl) yang aman: selalu path internal. */
export function signInUrl(pathname: string): string {
  const safe = pathname.startsWith("/") && !pathname.startsWith("//") ? pathname : `/${pathname.replace(/^\/+/, "")}`;
  return `/auth/signin?callbackUrl=${encodeURIComponent(safe)}`;
}
