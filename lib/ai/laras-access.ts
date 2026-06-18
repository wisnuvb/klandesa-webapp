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

export function buildAsistenAiHref(opts?: {
  prompt?: string;
  mode?: string;
}): string {
  const params = new URLSearchParams();
  if (opts?.mode) params.set("mode", opts.mode);
  if (opts?.prompt) params.set("prompt", opts.prompt);
  const qs = params.toString();
  return qs ? `/asisten-ai?${qs}` : "/asisten-ai";
}
