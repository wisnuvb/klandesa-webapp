import type { Session } from "next-auth";
import type { PermissionAction } from "./actions";
import type { PermissionResource } from "./resources";
import { roleCan } from "./matrix";
import { normalizeVillageRole } from "./roles";
import { isRegionalAccount } from "@/lib/regional-session";
import { isPlatformAccount } from "@/lib/platform-session";

export function canVillageUser(
  session: Session | null,
  resource: PermissionResource,
  action: PermissionAction,
): boolean {
  if (!session?.user?.id) return false;
  if (isRegionalAccount(session) || isPlatformAccount(session)) return false;
  const sid = String(session.user.id);
  if (sid.startsWith("rg:") || sid.startsWith("pl:") || sid.startsWith("pt:")) {
    return false;
  }
  // `permissionOverrides` dan `role` diisi ulang dari DB oleh requireVillageApiContext (bukan dari JWT yang bisa usang).
  return roleCan(resource, action, {
    role: normalizeVillageRole(session.user.role),
    permissionOverrides: session.user.permissionOverrides,
  });
}
