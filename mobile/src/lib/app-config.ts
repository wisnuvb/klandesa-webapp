import Constants from 'expo-constants';

import { resolveApiBase } from './api-base';

export { compareVersions, needsForceUpdate } from './app-config-pure';

export type RemoteConfig = {
  minSupportedVersion: string;
  latestVersion: string;
  forceUpdate: boolean;
  updateUrl: string;
  apiVersion: 'v1';
};

export const APP_VERSION: string = Constants.expoConfig?.version ?? '0.0.0';

/** Ambil konfigurasi jarak jauh. Null bila server tak terjangkau — app tetap jalan (jangan blokir warga karena sinyal). */
export async function fetchRemoteConfig(signal?: AbortSignal): Promise<RemoteConfig | null> {
  const base = resolveApiBase();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/mobile/v1/config`, {
      headers: { 'X-App-Version': APP_VERSION, 'X-App-Platform': 'android' },
      signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as RemoteConfig;
  } catch {
    return null;
  }
}
