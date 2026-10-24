import Constants from 'expo-constants';

/** Alamat API Klandesa. Saat dev tanpa env, pakai host mesin dev Expo pada port web (config/port.json via app.config.ts). */
export function resolveApiBase(): string | null {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  if (__DEV__) {
    const host = Constants.expoConfig?.hostUri?.split(':')[0];
    const port = Constants.expoConfig?.extra?.webPort;
    if (host && port) return `http://${host}:${port}`;
  }
  return null;
}
