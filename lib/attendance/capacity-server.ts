import { prisma } from "@/lib/prisma";
import { attendanceCapacityEnforced } from "./capacity";
import {
  ATTENDANCE_CAPACITY_MODULE_CODE,
  effectiveStaffLimit,
  isCapacityAddonCode,
  type ActiveCapacityAddon,
} from "./addons";

/** Add-on kapasitas absensi yang masih aktif (status active dan belum lewat masa berlaku), atau null. */
export async function getActiveCapacityAddon(villageId: number): Promise<ActiveCapacityAddon | null> {
  const row = await prisma.villageModuleSubscription.findUnique({
    where: { villageId_moduleCode: { villageId, moduleCode: ATTENDANCE_CAPACITY_MODULE_CODE } },
    select: { planCode: true, status: true, expiryDate: true },
  });
  if (!row || row.status !== "active" || row.expiryDate.getTime() <= Date.now()) return null;
  if (!isCapacityAddonCode(row.planCode)) return null;
  return { code: row.planCode, expiresAt: row.expiryDate };
}

/**
 * Apakah perangkat boleh absen? Memakai urutan yang sama dengan tabel absensi web (jabatan lalu nama),
 * sehingga yang boleh absen persis yang tampil di tabel. Selalu true bila batas tidak dipaksakan (desa paket lama).
 */
export async function isOfficialWithinAttendanceCapacity(opts: {
  villageId: number;
  officialId: number;
  subscriptionPlan: string | null | undefined;
}): Promise<{ allowed: boolean; limit: number }> {
  const addon = await getActiveCapacityAddon(opts.villageId);
  const limit = effectiveStaffLimit(opts.subscriptionPlan, addon);
  if (!attendanceCapacityEnforced(opts.subscriptionPlan)) return { allowed: true, limit };

  const inCapacity = await prisma.official.findMany({
    where: { villageId: opts.villageId, status: "active" },
    select: { id: true },
    orderBy: [{ position: { level: "asc" } }, { name: "asc" }],
    take: limit,
  });
  return { allowed: inCapacity.some((o) => o.id === opts.officialId), limit };
}
