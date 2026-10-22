/** Bandingkan "2.0.1" vs "2.0.0": -1 | 0 | 1. Segmen non-angka dianggap 0. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

export type MobileRemoteConfig = {
  minSupportedVersion: string;
  latestVersion: string;
  forceUpdate: boolean;
  updateUrl: string;
  apiVersion: "v1";
};

/**
 * Konfigurasi jarak jauh untuk force-update. Diatur lewat env agar bisa diubah tanpa rilis:
 * MOBILE_MIN_VERSION, MOBILE_LATEST_VERSION, MOBILE_PLAY_URL.
 * `forceUpdate` dihitung terhadap versi klien (header X-App-Version) bila ada.
 */
export function buildMobileConfig(
  clientVersion: string | null,
  env: Record<string, string | undefined> = process.env,
): MobileRemoteConfig {
  const min = env.MOBILE_MIN_VERSION?.trim() || "0.0.0";
  const latest = env.MOBILE_LATEST_VERSION?.trim() || min;
  return {
    minSupportedVersion: min,
    latestVersion: latest,
    forceUpdate: clientVersion ? compareVersions(clientVersion, min) < 0 : false,
    updateUrl: env.MOBILE_PLAY_URL?.trim() || "https://play.google.com/store/apps/details?id=id.klandesa.app",
    apiVersion: "v1",
  };
}
