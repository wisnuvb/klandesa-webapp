import {
  diffToOverrides,
  getAllowedActions,
  getRoleBaselineActions,
  type DesiredPermissions,
  type PermissionAction,
  type PermissionOverrides,
  type PermissionResource,
  type VillageRole,
} from "@/lib/permissions/client";
import { PERMISSION_CATALOG, applicableActions } from "@/lib/permissions/catalog";

/** Model murni editor izin: dipisah dari komponen agar bisa dites tanpa DOM. */
export type EditableResource = keyof typeof PERMISSION_CATALOG;
export type Draft = Record<EditableResource, PermissionAction[]>;

const RESOURCES = Object.keys(PERMISSION_CATALOG) as EditableResource[];

/** Izin efektif sebuah akun sebagai draf yang dapat diedit. */
export function draftFromAccount(role: VillageRole, overrides: PermissionOverrides | undefined): Draft {
  const actor = { role, permissionOverrides: overrides };
  return Object.fromEntries(RESOURCES.map((r) => [r, getAllowedActions(r, actor)])) as Draft;
}

export function baselineDraft(role: VillageRole): Draft {
  return draftFromAccount(role, undefined);
}

/** Atur satu kotak. Mencabut "Lihat" mencabut semua; menambah aksi lain otomatis menyalakan "Lihat". */
export function setAction(draft: Draft, resource: EditableResource, action: PermissionAction, on: boolean): Draft {
  const cur = new Set(draft[resource]);
  if (on) {
    cur.add(action);
    cur.add("read");
  } else if (action === "read") {
    cur.clear();
  } else {
    cur.delete(action);
  }
  return { ...draft, [resource]: applicableActions(resource).filter((a) => cur.has(a)) };
}

export type CellState = "on" | "off" | "added" | "removed";

/** Status kotak relatif terhadap bawaan role (untuk penanda non-warna "ditambah"/"dicabut"). */
export function cellState(role: VillageRole, draft: Draft, resource: EditableResource, action: PermissionAction): CellState {
  const base = getRoleBaselineActions(resource, role).includes(action);
  const now = draft[resource].includes(action);
  if (now && !base) return "added";
  if (!now && base) return "removed";
  return now ? "on" : "off";
}

export function overridesFromDraft(role: VillageRole, draft: Draft): PermissionOverrides {
  if (role === "admin") return {};
  return diffToOverrides((r) => getRoleBaselineActions(r, role), draft as DesiredPermissions);
}

/** Jumlah modul yang berbeda dari bawaan role. */
export function countCustomized(overrides: PermissionOverrides | undefined): number {
  if (!overrides) return 0;
  return new Set<PermissionResource>([
    ...(Object.keys(overrides.grant ?? {}) as PermissionResource[]),
    ...(Object.keys(overrides.deny ?? {}) as PermissionResource[]),
  ]).size;
}

export function isResourceCustomized(role: VillageRole, draft: Draft, resource: EditableResource): boolean {
  return applicableActions(resource).some((a) => cellState(role, draft, resource, a) === "added" || cellState(role, draft, resource, a) === "removed");
}
