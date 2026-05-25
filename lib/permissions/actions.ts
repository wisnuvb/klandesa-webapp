export const PERMISSION_ACTIONS = [
  "read",
  "create",
  "update",
  "delete",
  "approve",
  "export",
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

/** Shorthand CRUD+ untuk matriks. */
export type PermissionActionSet =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "approve"
  | "export"
  | "crud"
  | "crud_export"
  | "read_approve";

export function expandActionSet(set: PermissionActionSet): PermissionAction[] {
  switch (set) {
    case "crud":
      return ["read", "create", "update", "delete"];
    case "crud_export":
      return ["read", "create", "update", "delete", "export"];
    case "read_approve":
      return ["read", "approve"];
    case "read":
    case "create":
    case "update":
    case "delete":
    case "approve":
    case "export":
      return [set];
    default:
      return [];
  }
}
