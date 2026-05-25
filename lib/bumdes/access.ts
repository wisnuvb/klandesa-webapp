import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import type { Bumdes } from "@prisma/client";
import { requireVillagePermissionResponse } from "@/lib/access-policy";

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

/** Kelola profil, unit, transaksi. Admin & kepala desa. */
export function canManageBumdes(villageRole: string | undefined): boolean {
  return isVillageBumdesElevated(villageRole);
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
  if (canManageBumdes(session?.user?.role)) return null;
  return requireVillagePermissionResponse(session, "bumdes", "create");
}

export async function fetchBumdesForVillage(villageId: number): Promise<Bumdes | null> {
  const { prisma } = await import("@/lib/prisma");
  return prisma.bumdes.findUnique({ where: { villageId } });
}
