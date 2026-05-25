import type { Session } from "next-auth";
import { canVillageUser } from "@/lib/permissions";

/** Baca modul PKK — semua role dengan permission read (termasuk kepala desa). */
export function canReadPkk(session: Session | null): boolean {
  return canVillageUser(session, "pkk", "read");
}

/** CRUD data PKK — sekretaris & staff (admin desa juga). */
export function canManagePkk(session: Session | null): boolean {
  return (
    canVillageUser(session, "pkk", "create") &&
    canVillageUser(session, "pkk", "update")
  );
}

export function canCreatePkk(session: Session | null): boolean {
  return canVillageUser(session, "pkk", "create");
}

export function canUpdatePkk(session: Session | null): boolean {
  return canVillageUser(session, "pkk", "update");
}

export function canDeletePkk(session: Session | null): boolean {
  return canVillageUser(session, "pkk", "delete");
}
