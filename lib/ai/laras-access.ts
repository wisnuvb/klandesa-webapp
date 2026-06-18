/** Halaman yang tidak menampilkan FAB Laras (sudah ada promosi/UX khusus). */
const LARAS_FAB_HIDDEN_PREFIXES = [
  "/dashboard",
  "/asisten-ai",
  "/onboarding",
  "/auth",
] as const;

export function shouldShowLarasFab(pathname: string | null | undefined): boolean {
  const path = pathname || "/";
  return !LARAS_FAB_HIDDEN_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}
