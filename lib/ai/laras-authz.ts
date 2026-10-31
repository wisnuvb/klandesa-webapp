import type { Session } from "next-auth";
import { canVillageUser } from "@/lib/permissions/can";
import type { PermissionAction } from "@/lib/permissions/actions";
import type { PermissionResource } from "@/lib/permissions/resources";

/**
 * Cek izin Laras memakai role SEGAR dari database, bukan role di JWT (yang hanya diisi saat login dan bisa basi sampai
 * 30 hari). Memakai `canVillageUser` pada salinan sesi supaya penolakan akun non-desa (platform/regional/mitra) tetap berlaku.
 */
export function larasCan(
  session: Session | null,
  freshRole: string | null | undefined,
  resource: PermissionResource,
  action: PermissionAction,
): boolean {
  if (!session?.user) return false;
  return canVillageUser({ ...session, user: { ...session.user, role: freshRole ?? undefined } } as Session, resource, action);
}
