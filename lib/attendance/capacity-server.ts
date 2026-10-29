import { prisma } from "@/lib/prisma";
import { attendanceCapacityEnforced, staffLimitForPlan } from "./capacity";

/**
 * Apakah perangkat boleh absen? Memakai urutan yang sama dengan tabel absensi web (jabatan lalu nama),
 * sehingga yang boleh absen persis yang tampil di tabel. Selalu true bila batas tidak dipaksakan (desa paket lama).
 */
export async function isOfficialWithinAttendanceCapacity(opts: {
  villageId: number;
  officialId: number;
  subscriptionPlan: string | null | undefined;
}): Promise<{ allowed: boolean; limit: number }> {
  const limit = staffLimitForPlan(opts.subscriptionPlan);
  if (!attendanceCapacityEnforced(opts.subscriptionPlan)) return { allowed: true, limit };

  const inCapacity = await prisma.official.findMany({
    where: { villageId: opts.villageId, status: "active" },
    select: { id: true },
    orderBy: [{ position: { level: "asc" } }, { name: "asc" }],
    take: limit,
  });
  return { allowed: inCapacity.some((o) => o.id === opts.officialId), limit };
}
