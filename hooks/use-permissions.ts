"use client";

import { useMemo } from "react";
import { useNextAuthSession } from "@/hooks/use-nextauth-session";
import { getAllowedActions, roleCan } from "@/lib/permissions/matrix";
import type { PermissionAction } from "@/lib/permissions/actions";
import type { PermissionResource } from "@/lib/permissions/resources";
import { normalizeVillageRole, type VillageRole } from "@/lib/permissions/roles";

export function usePermissions() {
  const { user } = useNextAuthSession();
  const role = normalizeVillageRole(user?.role);

  const can = useMemo(
    () => (resource: PermissionResource, action: PermissionAction) =>
      roleCan(resource, action, role),
    [role],
  );

  const allowedActions = useMemo(
    () => (resource: PermissionResource) => getAllowedActions(resource, role),
    [role],
  );

  return { role: role as VillageRole, can, allowedActions };
}
