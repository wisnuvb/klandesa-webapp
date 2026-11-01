import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api, post, refreshSession, setAccessToken, setSessionExpiredHandler, type Tokens } from '@/lib/api';
import { clearOutbox } from '@/lib/outbox';
import { queryClient } from '@/lib/queries';
import { profileStore, refreshTokenStore } from '@/lib/storage';

export type Profile = {
  account: { type: 'citizen' | 'staff'; id: number; name: string; username?: string; role: string; photoUrl?: string | null };
  village: { id: number; code: string; name: string; logoUrl: string | null };
};

type Status = 'loading' | 'signedOut' | 'signedIn';

type Ctx = {
  status: Status;
  profile: Profile | null;
  /** Dipanggil setelah login/daftar berhasil (respons berisi token + profil). */
  signIn: (r: Tokens & Profile) => Promise<void>;
  signOut: () => Promise<void>;
  /** Perbarui data akun yang tersimpan di HP (mis. foto profil setelah diganti). */
  updateAccount: (patch: Partial<Profile['account']>) => Promise<void>;
};

const SessionContext = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [profile, setProfile] = useState<Profile | null>(null);

  const clear = useCallback(async () => {
    setAccessToken(null);
    queryClient.clear(); // jangan bocorkan data akun sebelumnya ke akun berikutnya
    await Promise.all([refreshTokenStore.clear(), profileStore.clear(), clearOutbox()]);
    setProfile(null);
    setStatus('signedOut');
  }, []);

  const signIn = useCallback(async (r: Tokens & Profile) => {
    setAccessToken(r.accessToken);
    await refreshTokenStore.set(r.refreshToken);
    const p: Profile = { account: r.account, village: r.village };
    await profileStore.set(p);
    setProfile(p);
    setStatus('signedIn');
  }, []);

  const updateAccount = useCallback(
    async (patch: Partial<Profile['account']>) => {
      if (!profile) return;
      const next: Profile = { ...profile, account: { ...profile.account, ...patch } };
      setProfile(next);
      await profileStore.set(next);
    },
    [profile],
  );

  const signOut = useCallback(async () => {
    const rt = await refreshTokenStore.get();
    if (rt) await post('/auth/logout', { refreshToken: rt }, false).catch(() => undefined);
    await clear();
  }, [clear]);

  useEffect(() => {
    setSessionExpiredHandler(() => void clear());
    return () => setSessionExpiredHandler(null);
  }, [clear]);

  // Pulihkan sesi saat app dibuka. Offline: tetap masuk memakai profil tersimpan.
  useEffect(() => {
    let alive = true;
    void (async () => {
      const [rt, cached] = await Promise.all([refreshTokenStore.get(), profileStore.get<Profile>()]);
      if (!rt) return alive && setStatus('signedOut');
      const ok = await refreshSession();
      if (!alive) return;
      if (ok) {
        const fresh = await api<Profile>('/me').catch(() => null);
        const p = fresh ?? cached;
        if (p) {
          await profileStore.set(p);
          setProfile(p);
          return setStatus('signedIn');
        }
      } else if (cached && (await refreshTokenStore.get())) {
        setProfile(cached); // token masih ada tapi server tak terjangkau
        return setStatus('signedIn');
      }
      await clear();
    })();
    return () => {
      alive = false;
    };
  }, [clear]);

  const value = useMemo(() => ({ status, profile, signIn, signOut, updateAccount }), [status, profile, signIn, signOut, updateAccount]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Ctx {
  const v = useContext(SessionContext);
  if (!v) throw new Error('useSession harus di dalam SessionProvider');
  return v;
}
