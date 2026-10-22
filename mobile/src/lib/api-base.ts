import Constants from 'expo-constants';

/** Alamat API Klandesa. Saat dev tanpa env, pakai host mesin dev Expo pada port web (2042). */
export function resolveApiBase(): string | null {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  if (__DEV__) {
    const host = Constants.expoConfig?.hostUri?.split(':')[0];
    if (host) return `http://${host}:2042`;
  }
  return null;
}
