"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useNextAuthSession } from "@/hooks/use-nextauth-session";
import { fetchJsonDeduped } from "@/lib/client/fetch-cache";

export type CooperativeAccessState = {
  showCoopMenu: boolean;
  cooperativeOnlyNav: boolean;
  canRead: boolean;
  canManage: boolean;
  accessKind: string | null;
  cooperativeId: number | null;
  hasCooperative: boolean;
  cooperative: { id: number; name: string } | null;
  membership: {
    id: number;
    coopAppRole: string;
    boardTitle: string | null;
  } | null;
};

type Ctx = {
  access: CooperativeAccessState | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const CooperativeNavContext = createContext<Ctx | null>(null);

export function CooperativeNavProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, user } = useNextAuthSession();
  const [access, setAccess] = useState<CooperativeAccessState | null>(null);
  const [loading, setLoading] = useState(true);

  // Primitif, bukan objek `user`: SessionProvider membuat objek sesi baru tiap tab difokuskan ulang, dan itu dulu
  // memicu fetch /api/coop/access setiap kali (sama seperti catatan di Header).
  const accountType = (user as { accountType?: string } | null)?.accountType;

  // `force`: refresh() eksplisit (mis. setelah koperasi dibuat) wajib ke jaringan, tidak ikut request yang sudah berjalan.
  const load = useCallback(
    async (force: boolean, isAlive: () => boolean = () => true) => {
      if (!isAuthenticated) {
        if (isAlive()) {
          setAccess(null);
          setLoading(false);
        }
        return;
      }
      if (accountType && accountType !== "village") {
        if (isAlive()) {
          setAccess(null);
          setLoading(false);
        }
        return;
      }
      if (isAlive()) setLoading(true);
      try {
        const r = await fetchJsonDeduped<CooperativeAccessState>("/api/coop/access", { force });
        if (!isAlive()) return;
        setAccess(r.ok ? r.body : null);
      } catch {
        if (isAlive()) setAccess(null);
      } finally {
        if (isAlive()) setLoading(false);
      }
    },
    [isAuthenticated, accountType],
  );

  const refresh = useCallback(() => load(true), [load]);

  useEffect(() => {
    let alive = true;
    void load(false, () => alive);
    return () => {
      alive = false;
    };
  }, [load]);

  return (
    <CooperativeNavContext.Provider value={{ access, loading, refresh }}>
      {children}
    </CooperativeNavContext.Provider>
  );
}

export function useCooperativeNav(): Ctx {
  const v = useContext(CooperativeNavContext);
  if (!v) {
    throw new Error(
      "useCooperativeNav dipakai di luar CooperativeNavProvider",
    );
  }
  return v;
}
