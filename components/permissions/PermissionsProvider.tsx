"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { signOut } from "next-auth/react";
import type { PermissionActor } from "@/lib/permissions/client";

/**
 * Izin efektif akun yang sedang masuk (role + penyesuaian per akun) dari DB, bukan dari JWT yang bisa usang.
 * Penegakan sesungguhnya tetap di API; ini hanya untuk menu/tombol/halaman.
 */
const Ctx = createContext<PermissionActor | null>(null);
/** false selama izin masih dimuat dari server; true bila sudah diketahui (atau tidak relevan, mis. di tes). */
const LoadedCtx = createContext<boolean>(true);

/** Penyedia dengan nilai yang sudah diketahui (dipakai di tes dan tempat yang sudah punya datanya). */
export function PermissionsProvider({ actor, children }: { actor: PermissionActor | null; children: ReactNode }) {
  return <Ctx.Provider value={actor}>{children}</Ctx.Provider>;
}

/**
 * Memuat izin efektif akun desa dari `/api/account/permissions` sekali per muat penuh (state bertahan selama navigasi
 * sisi klien). Shell statis tidak lagi menerima izin dari layout server, jadi diminta lewat API.
 * Gagal (jaringan/5xx) -> `actor` null + `loaded` true: UI tidak menyembunyikan apa pun, API tetap menolak (403).
 */
export function RemotePermissionsProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const [state, setState] = useState<{ actor: PermissionActor | null; loaded: boolean }>({ actor: null, loaded: !enabled });

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const load = async (attempt: number): Promise<void> => {
      try {
        const res = await fetch("/api/account/permissions", { cache: "no-store" });
        // 401/403 = sesi/akun bermasalah: mengulang tidak membantu (gerbang shell yang mengalihkan).
        if (res.status === 401 || res.status === 403) {
          // Kata sandi akun berubah sejak sesi ini dibuat (mis. direset karena dicurigai bocor): keluarkan sesi ini.
          if (res.status === 401) {
            const body = (await res.json().catch(() => null)) as { code?: string } | null;
            if (body?.code === "SESSION_REVOKED") {
              if (alive) void signOut({ callbackUrl: "/auth/signin?sesi=berakhir" });
              return;
            }
          }
          if (alive) setState({ actor: null, loaded: true });
          return;
        }
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { role?: string; permissionOverrides?: unknown };
        if (alive) setState({ actor: data.role ? { role: data.role, permissionOverrides: data.permissionOverrides ?? null } : null, loaded: true });
      } catch {
        if (attempt < 1) return load(attempt + 1);
        if (alive) setState({ actor: null, loaded: true });
      }
    };
    void load(0);
    return () => {
      alive = false;
    };
  }, [enabled]);

  return (
    <LoadedCtx.Provider value={enabled ? state.loaded : true}>
      <Ctx.Provider value={state.actor}>{children}</Ctx.Provider>
    </LoadedCtx.Provider>
  );
}

export function useEffectiveActor(): PermissionActor | null {
  return useContext(Ctx);
}

export function usePermissionsLoaded(): boolean {
  return useContext(LoadedCtx);
}
