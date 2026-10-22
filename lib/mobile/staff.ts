import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError, requireMobileContext, type MobileContext } from "./context";
import {
  roleCan, normalizeVillageRole,
  type PermissionAction, type PermissionResource,
} from "@/lib/permissions";

export type StaffContext = MobileContext & { userId: number; name: string; roleLabel: string };

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin Desa",
  staff: "Staf Desa",
  village_head: "Kepala Desa",
  secretary: "Sekretaris Desa",
};

/** Guard endpoint perangkat desa: token staf + izin RBAC web (matriks yang sama) pada resource & aksi. */
export async function requireStaff(
  req: NextRequest,
  resource: PermissionResource,
  action: PermissionAction,
): Promise<{ ok: true; ctx: StaffContext } | { ok: false; response: NextResponse }> {
  const loaded = await requireMobileContext(req, { allow: ["staff"] });
  if (!loaded.ok) return loaded;
  const role = normalizeVillageRole(loaded.ctx.role);
  if (!roleCan(resource, action, role)) {
    return { ok: false, response: mobileError("FORBIDDEN", "Peran Anda tidak punya izin untuk tindakan ini.", 403) };
  }
  const user = await prisma.user.findUnique({ where: { id: loaded.ctx.accountId }, select: { name: true } });
  return { ok: true, ctx: { ...loaded.ctx, userId: loaded.ctx.accountId, name: user?.name ?? "Perangkat Desa", roleLabel: ROLE_LABEL[role] ?? role } };
}

/** Catat tindakan di AuditLog; gagal mencatat tidak menggagalkan aksi. */
export async function audit(
  ctx: StaffContext,
  req: Request,
  action: string,
  entity: string,
  entityId: string | number | bigint,
  changes?: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        villageId: ctx.villageId, userId: ctx.userId, action, entity, entityId: String(entityId),
        changes: changes ? JSON.parse(JSON.stringify(changes)) : undefined,
        metadata: { via: "mobile" },
        ipAddress: (req.headers.get("x-forwarded-for")?.split(",")[0] ?? "").trim().slice(0, 50) || null,
        userAgent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
      },
    });
  } catch (e) {
    console.error("audit failed:", e);
  }
}
