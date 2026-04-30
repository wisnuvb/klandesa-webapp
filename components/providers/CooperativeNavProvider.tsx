"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useNextAuthSession } from "@/hooks/use-nextauth-session";

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

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setAccess(null);
      setLoading(false);
      return;
    }
    const at = (user as { accountType?: string } | null)?.accountType;
    if (at === "regional") {
      setAccess(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const r = await fetch("/api/coop/access", { cache: "no-store" });
      if (!r.ok) {
        setAccess(null);
        return;
      }
      const data = (await r.json()) as CooperativeAccessState;
      setAccess(data);
    } catch {
      setAccess(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
