import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import { isRegionalAccount } from "@/lib/regional-session";
import { jsonForbidden } from "@/lib/api-village-context";

/** User desa (bukan akun regional) dengan sesi yang punya id numerik. */
export function canAccessVillageApp(session: Session | null): boolean {
  if (!session?.user?.id) return false;
  if (isRegionalAccount(session)) return false;
  if (String(session.user.id).startsWith("rg:")) return false;
  return true;
}

export function requireVillageRole(
  session: Session | null,
  allowedRoles: readonly string[],
): boolean {
  const role = session?.user?.role;
  if (!role) return false;
  return allowedRoles.includes(role);
}

/** Admin desa — selaras dengan cek role di website engine config. */
export function requireVillageAdminResponse(
  session: Session | null,
): NextResponse | null {
  if (!requireVillageRole(session, ["admin"])) {
    return jsonForbidden();
  }
  return null;
}
