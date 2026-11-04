import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import type { Bumdes } from "@prisma/client";
import { requireVillagePermissionResponse } from "@/lib/access-policy";
import { parsePermissionOverrides, roleCan, type PermissionActor } from "@/lib/permissions";

export function isVillageBumdesElevated(villageRole?: string | null): boolean {
  const r = String(villageRole ?? "").toLowerCase();
  return r === "admin" || r === "village_head";
}

/** Baca modul BUMDes: admin, kepala desa, sekretaris, staff. */
export function canReadBumdesModule(villageRole: string | undefined): boolean {
  if (isVillageBumdesElevated(villageRole)) return true;
  const r = String(villageRole ?? "").toLowerCase();
  return r === "secretary" || r === "staff";
}

type BumdesWho = string | null | undefined | PermissionActor;

const roleOf = (who: BumdesWho): string | undefined =>
  typeof who === "object" && who !== null ? (who.role ?? undefined) : (who ?? undefined);

/**
 * Kelola profil, unit, transaksi. Admin & kepala desa (bawaan). Bila admin menyesuaikan izin BUMDes sebuah akun,
 * penyesuaian itu yang berlaku: kepala desa yang izin BUMDes-nya disesuaikan harus punya "create" untuk mengelola.
 */
export function canManageBumdes(who: BumdesWho): boolean {
  const role = roleOf(who);
  if (role === "admin") return true;
  if (!isVillageBumdesElevated(role)) return false;
  if (typeof who === "object" && who !== null) {
    const o = parsePermissionOverrides(who.permissionOverrides);
    if (o.grant?.bumdes || o.deny?.bumdes) return roleCan("bumdes", "create", who);
  }
  return true;
}

export function requireBumdesReadResponse(
  session: Session | null,
): NextResponse | null {
  const permErr = requireVillagePermissionResponse(session, "bumdes", "read");
  if (permErr) return permErr;
  if (!canReadBumdesModule(session?.user?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export function requireBumdesManageResponse(
  session: Session | null,
): NextResponse | null {
  if (canManageBumdes(session?.user)) return null;
  return requireVillagePermissionResponse(session, "bumdes", "create");
}

/**
 * Varian berbasis peran dari DATABASE (ctx.dbUser.role), bukan klaim JWT sesi: admin yang diturunkan kehilangan akses seketika,
 * bukan menunggu token kedaluwarsa.
 */
export function requireBumdesReadForRole(who: BumdesWho): NextResponse | null {
  const actor: PermissionActor = typeof who === "object" && who !== null ? who : { role: who };
  if (!roleCan("bumdes", "read", actor) || !canReadBumdesModule(roleOf(who))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export function requireBumdesManageForRole(who: BumdesWho): NextResponse | null {
  if (canManageBumdes(who)) return null;
  const actor: PermissionActor = typeof who === "object" && who !== null ? who : { role: who };
  return roleCan("bumdes", "create", actor) ? null : NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function fetchBumdesForVillage(villageId: number): Promise<Bumdes | null> {
  const { prisma } = await import("@/lib/prisma");
  return prisma.bumdes.findUnique({ where: { villageId } });
}
