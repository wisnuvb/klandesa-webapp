import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const KEYS = { refresh: 'kd.refresh', profile: 'kd.profile', device: 'kd.device' } as const;
const PREF_PREFIX = 'kd.pref.';

async function get(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}
async function set(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // Penyimpanan aman gagal (jarang): sesi hanya hidup sampai app ditutup.
  }
}
async function del(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    /* abaikan */
  }
}

export const refreshTokenStore = {
  get: () => get(KEYS.refresh),
  set: (v: string) => set(KEYS.refresh, v),
  clear: () => del(KEYS.refresh),
};

/** Profil ringkas (nama, desa) untuk menampilkan beranda saat offline. Bukan data sensitif. */
export const profileStore = {
  get: async <T,>(): Promise<T | null> => {
    const raw = await get(KEYS.profile);
    try {
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  set: (v: unknown) => set(KEYS.profile, JSON.stringify(v)),
  clear: () => del(KEYS.profile),
};

/** Id perangkat acak yang stabil; dipakai untuk daftar sesi, bukan untuk pelacakan. */
export async function getDeviceId(): Promise<string> {
  const existing = await get(KEYS.device);
  if (existing) return existing;
  const id = Crypto.randomUUID();
  await set(KEYS.device, id);
  return id;
}

/** Preferensi tampilan (bukan rahasia), misalnya ukuran huruf. Tidak dihapus saat keluar akun: ini milik perangkat. */
export const prefStore = {
  get: (name: string) => get(PREF_PREFIX + name),
  set: (name: string, value: string) => set(PREF_PREFIX + name, value),
};
