import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import { jsonForbidden } from "@/lib/api-village-context";
import type { PermissionAction } from "./actions";
import type { PermissionResource } from "./resources";
import { canVillageUser } from "./can";

export function requirePermissionResponse(
  session: Session | null,
  resource: PermissionResource,
  action: PermissionAction,
  message = "Forbidden",
): NextResponse | null {
  if (!canVillageUser(session, resource, action)) {
    return jsonForbidden(message);
  }
  return null;
}
