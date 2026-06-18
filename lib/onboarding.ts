/** Rute yang boleh diakses saat onboarding belum selesai (checklist + halaman onboarding). */
export const ONBOARDING_FLOW_PATHS = [
  "/onboarding",
  "/pengaturan-desa",
  "/data-perangkat",
  "/data-warga",
  "/layanan-surat",
] as const;

export function isOnboardingFlowPath(pathname: string): boolean {
  const path = pathname || "/";
  return ONBOARDING_FLOW_PATHS.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );
}
