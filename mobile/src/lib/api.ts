import { resolveApiBase } from './api-base';
import { APP_VERSION } from './app-config';
import { getDeviceId, refreshTokenStore } from './storage';

export type ApiErrorCode =
  | 'UNAUTHENTICATED' | 'ACCOUNT_DISABLED' | 'VILLAGE_INACTIVE' | 'VILLAGE_READ_ONLY' | 'FORBIDDEN'
  | 'RATE_LIMITED' | 'INVALID_REQUEST' | 'NETWORK' | 'SERVER';

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public status: number,
    public extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export type Tokens = { accessToken: string; refreshToken: string; expiresIn: number };

let accessToken: string | null = null;
let onSessionExpired: (() => void) | null = null;

export function setAccessToken(t: string | null) {
  accessToken = t;
}
export function setSessionExpiredHandler(fn: (() => void) | null) {
  onSessionExpired = fn;
}

async function rawFetch(path: string, init: RequestInit & { auth?: boolean } = {}): Promise<Response> {
  const base = resolveApiBase();
  if (!base) throw new ApiError('NETWORK', 'Aplikasi belum terhubung ke server.', 0);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-App-Version': APP_VERSION,
    'X-App-Platform': 'android',
    'X-Device-Id': await getDeviceId(),
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (init.auth !== false && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  try {
    return await fetch(`${base}/api/mobile/v1${path}`, { ...init, headers });
  } catch {
    throw new ApiError('NETWORK', 'Tidak ada sinyal. Periksa koneksi lalu coba lagi.', 0);
  }
}

async function toError(res: Response): Promise<ApiError> {
  let body: { error?: { code?: ApiErrorCode; message?: string } & Record<string, unknown> } | null = null;
  try {
    body = await res.json();
  } catch {
    /* bukan JSON */
  }
  const e = body?.error;
  if (e?.code) {
    const { code, message, ...extra } = e;
    return new ApiError(code, message ?? 'Terjadi kesalahan.', res.status, extra);
  }
  return new ApiError('SERVER', 'Maaf, sedang ada gangguan. Data Anda aman, coba lagi sebentar.', res.status);
}

let refreshing: Promise<boolean> | null = null;

/** Satu refresh pada satu waktu; true bila sesi berhasil diperbarui. */
export function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    const rt = await refreshTokenStore.get();
    if (!rt) return false;
    try {
      const res = await rawFetch('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: rt }), auth: false });
      if (!res.ok) {
        if (res.status === 401) await refreshTokenStore.clear();
        return false;
      }
      const t = (await res.json()) as Tokens;
      accessToken = t.accessToken;
      await refreshTokenStore.set(t.refreshToken);
      return true;
    } catch {
      return false; // offline: pertahankan token untuk percobaan berikutnya
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export async function api<T>(path: string, init: RequestInit & { auth?: boolean } = {}): Promise<T> {
  let res = await rawFetch(path, init);
  if (res.status === 401 && init.auth !== false && (await refreshSession())) {
    res = await rawFetch(path, init);
  }
  if (res.status === 401 && init.auth !== false) onSessionExpired?.();
  if (!res.ok) throw await toError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const post = <T,>(path: string, body: unknown, auth = true) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(body), auth });
