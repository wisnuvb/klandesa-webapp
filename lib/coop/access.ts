import type {
  Cooperative,
  CoopAppRole,
  CooperativeMember,
} from "@prisma/client";

export function isVillageCoopElevated(villageRole?: string | null): boolean {
  const r = String(villageRole ?? "").toLowerCase();
  return r === "admin" || r === "village_head";
}

/** Baca data koperasi + buku kas + daftar anggota (pengurus & manager; admin override). */
export function canReadCoopModule(
  villageRole: string | undefined,
  coopAppRole: CoopAppRole,
): boolean {
  if (isVillageCoopElevated(villageRole)) return true;
  return coopAppRole === "board" || coopAppRole === "manager";
}

/** Kelola profil, anggota, transaksi kas. */
export function canManageCoop(
  villageRole: string | undefined,
  coopAppRole: CoopAppRole,
): boolean {
  if (isVillageCoopElevated(villageRole)) return true;
  return coopAppRole === "manager";
}

export type CoopEffectiveAccess =
  | { kind: "elevated"; manage: true; read: true }
  | { kind: "manager"; manage: true; read: true }
  | { kind: "board"; manage: false; read: true }
  | null;

export function effectiveCoopAccess(
  villageRole: string | undefined,
  membership: CooperativeMember | null,
): CoopEffectiveAccess {
  if (isVillageCoopElevated(villageRole)) {
    return { kind: "elevated", manage: true, read: true };
  }
  if (!membership || membership.coopAppRole === "none") return null;
  if (membership.coopAppRole === "manager") {
    return { kind: "manager", manage: true, read: true };
  }
  return { kind: "board", manage: false, read: true };
}

/** Menu sidebar: elevated selalu; atau punya akses dashboard koperasi. */
export function shouldShowCoopInSidebar(
  villageRole: string | undefined,
  membership: CooperativeMember | null,
): boolean {
  if (isVillageCoopElevated(villageRole)) return true;
  if (!membership) return false;
  return membership.coopAppRole === "board" || membership.coopAppRole === "manager";
}

/** cooperative ada atau belum — untuk UI bootstrap (hanya admin / kepala desa). */
export function showCoopNavWhenNoCoopYet(villageRole: string | undefined): boolean {
  return isVillageCoopElevated(villageRole);
}

/** Akun dengan peran koperasi board/manager tapi bukan pemangku kepala/admin/sekretaris: sidebar hanya modul koperasi (+ profil/billing). */
export function usesCooperativeOnlyNav(
  villageRole: string | undefined,
  membership: CooperativeMember | null,
): boolean {
  if (!membership) return false;
  if (
    membership.coopAppRole !== "board" &&
    membership.coopAppRole !== "manager"
  ) {
    return false;
  }
  if (isVillageCoopElevated(villageRole)) return false;
  const r = String(villageRole ?? "").toLowerCase();
  if (r === "secretary") return false;
  return true;
}

export async function fetchCooperativeForVillage(villageId: number): Promise<Cooperative | null> {
  const { prisma } = await import("@/lib/prisma");
  return prisma.cooperative.findUnique({ where: { villageId } });
}

export async function fetchMembershipForUser(
  cooperativeId: number,
  userId: number,
): Promise<CooperativeMember | null> {
  const { prisma } = await import("@/lib/prisma");
  return prisma.cooperativeMember.findFirst({
    where: { cooperativeId, linkedUserId: userId },
  });
}
