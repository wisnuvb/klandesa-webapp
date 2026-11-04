"use client";

import { useMemo } from "react";
import { useNextAuthSession } from "@/hooks/use-nextauth-session";
import { useEffectiveActor } from "@/components/permissions/PermissionsProvider";
import { getAllowedActions, roleCan } from "@/lib/permissions/matrix";
import type { PermissionAction } from "@/lib/permissions/actions";
import type { PermissionResource } from "@/lib/permissions/resources";
import { normalizeVillageRole, type VillageRole } from "@/lib/permissions/roles";

export function usePermissions() {
  const { user } = useNextAuthSession();
  // Utamakan izin dari DB (provider di layout); JWT hanya cadangan sebelum provider tersedia.
  const provided = useEffectiveActor();
  const role = normalizeVillageRole(provided?.role ?? user?.role);
  const overrides = provided?.permissionOverrides;

  const can = useMemo(
    () => (resource: PermissionResource, action: PermissionAction) =>
      roleCan(resource, action, { role, permissionOverrides: overrides }),
    [role, overrides],
  );

  const allowedActions = useMemo(
    () => (resource: PermissionResource) => getAllowedActions(resource, { role, permissionOverrides: overrides }),
    [role, overrides],
  );

  return { role: role as VillageRole, can, allowedActions };
}
