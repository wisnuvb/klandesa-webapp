"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PermissionActor } from "@/lib/permissions/client";

/**
 * Izin efektif akun yang sedang masuk (role + penyesuaian per akun) dari DB saat halaman dimuat server,
 * bukan dari JWT yang bisa usang. Penegakan sesungguhnya tetap di API; ini hanya untuk menu/tombol/halaman.
 */
const Ctx = createContext<PermissionActor | null>(null);

export function PermissionsProvider({ actor, children }: { actor: PermissionActor | null; children: ReactNode }) {
  return <Ctx.Provider value={actor}>{children}</Ctx.Provider>;
}

export function useEffectiveActor(): PermissionActor | null {
  return useContext(Ctx);
}
