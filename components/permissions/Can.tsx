"use client";

import type { ReactNode } from "react";
import { usePermissions } from "@/hooks/use-permissions";
import type { PermissionAction } from "@/lib/permissions/actions";
import type { PermissionResource } from "@/lib/permissions/resources";

type CanProps = {
  resource: PermissionResource;
  action: PermissionAction;
  children: ReactNode;
  fallback?: ReactNode;
};

export function Can({ resource, action, children, fallback = null }: CanProps) {
  const { can } = usePermissions();
  if (!can(resource, action)) return <>{fallback}</>;
  return <>{children}</>;
}
