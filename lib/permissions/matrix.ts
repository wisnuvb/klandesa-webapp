import {
  expandActionSet,
  type PermissionAction,
  type PermissionActionSet,
} from "./actions";
import type { PermissionResource } from "./resources";
import type { VillageRole } from "./roles";

type RoleActionMap = Partial<
  Record<VillageRole, PermissionActionSet | PermissionAction[]>
>;

/** Matriks permission desa — extend saat modul baru ditambah. */
export const VILLAGE_PERMISSION_MATRIX: Record<
  PermissionResource,
  RoleActionMap
> = {
  residents: {
    admin: "crud_export",
    village_head: "read",
    secretary: "crud",
    staff: "crud",
  },
  officials: {
    admin: "crud",
    village_head: "read",
    secretary: "crud",
    staff: "read",
  },
  potentials: {
    admin: "crud",
    village_head: "read",
    secretary: "crud",
    staff: "crud",
  },
  anggaran: {
    admin: "crud",
    village_head: "read_approve",
    secretary: "read",
    staff: "read",
  },
  finance: {
    admin: "crud_export",
    village_head: "read_approve",
    secretary: "read",
    staff: "read",
  },
  mail: {
    admin: "crud_export",
    village_head: "read",
    secretary: "crud",
    staff: "crud",
  },
  statistics: {
    admin: "read",
    village_head: "read",
    secretary: "read",
    staff: "read",
  },
  announcements: {
    admin: "crud",
    village_head: "read",
    secretary: "crud",
    staff: "crud",
  },
  forum: {
    admin: "crud",
    village_head: "read",
    secretary: "crud",
    staff: "crud",
  },
  citizen_reports: {
    admin: "crud",
    village_head: "read",
    secretary: "crud",
    staff: "crud",
  },
  social_benefits: {
    admin: "crud_export",
    village_head: "read",
    secretary: "crud",
    staff: "crud",
  },
  attendance: {
    admin: "crud",
    village_head: "crud",
    secretary: "read",
    staff: "read",
  },
  archive: {
    admin: "crud",
    village_head: "read",
    secretary: "crud",
    staff: "crud",
  },
  ukm: {
    admin: "crud",
    village_head: "read",
    secretary: "crud",
    staff: "crud",
  },
  cooperative: {
    admin: "crud",
    village_head: "crud",
    secretary: "read",
    staff: "read",
  },
  website: {
    admin: "crud",
    village_head: "read",
    secretary: "read",
    staff: "read",
  },
  settings: {
    admin: "crud",
    village_head: "read",
    secretary: "read",
    staff: "read",
  },
  billing: {
    admin: "crud",
    village_head: "read",
    secretary: "read",
    staff: "read",
  },
  bumdes: {
    admin: "crud",
    village_head: "read_approve",
    secretary: "read",
    staff: "read",
  },
  pkk: {
    admin: "crud_export",
    village_head: "read",
    secretary: "crud_export",
    staff: "crud",
  },
  sdgs: {
    admin: "read",
    village_head: "read",
    secretary: "read",
    staff: "read",
  },
  rpjmdes: {
    admin: "crud",
    village_head: "read_approve",
    secretary: "crud",
    staff: "read",
  },
  pertanian: {
    admin: "crud",
    village_head: "read",
    secretary: "crud",
    staff: "crud",
  },
  rtrw: {
    admin: "crud",
    village_head: "read_approve",
    secretary: "crud",
    staff: "crud",
  },
  integrations: {
    admin: "crud_export",
    village_head: "read",
    secretary: "crud_export",
    staff: "read",
  },
  gis: {
    admin: "crud",
    village_head: "read",
    secretary: "crud",
    staff: "read",
  },
  lingkungan: {
    admin: "crud",
    village_head: "read",
    secretary: "crud",
    staff: "crud",
  },
  ai_assistant: {
    admin: "crud",
    village_head: "read",
    secretary: "read",
    staff: "read",
  },
};

function resolveActions(
  entry: PermissionActionSet | PermissionAction[] | undefined,
): PermissionAction[] {
  if (!entry) return [];
  if (Array.isArray(entry)) return entry;
  return expandActionSet(entry);
}

export function getAllowedActions(
  resource: PermissionResource,
  role: VillageRole,
): PermissionAction[] {
  const map = VILLAGE_PERMISSION_MATRIX[resource]?.[role];
  return resolveActions(map);
}

export function roleCan(
  resource: PermissionResource,
  action: PermissionAction,
  role: VillageRole,
): boolean {
  return getAllowedActions(resource, role).includes(action);
}
