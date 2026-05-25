import { prisma } from "@/lib/prisma";

function calcAgeYears(birthDate: Date, ref = new Date()): number {
  let age = ref.getFullYear() - birthDate.getFullYear();
  const m = ref.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function monthBounds(ref = new Date()) {
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export type PkkStats = {
  balitaStunting: number;
  ibuHamil: number;
  balita: number;
  dasawismaCount: number;
  posyanduSessionsThisMonth: number;
  stuntingFromVisits: number;
};

export async function computePkkStats(villageId: number): Promise<PkkStats> {
  const now = new Date();
  const { start, end } = monthBounds(now);

  const [residents, dasawismaCount, posyanduSessionsThisMonth, stuntingFromVisits] =
    await Promise.all([
      prisma.resident.findMany({
        where: { villageId, isAlive: true },
        select: {
          birthDate: true,
          isPregnant: true,
          isStunting: true,
        },
      }),
      prisma.dasawisma.count({ where: { villageId } }),
      prisma.posyanduSession.count({
        where: {
          villageId,
          sessionDate: { gte: start, lte: end },
        },
      }),
      prisma.posyanduVisit.count({
        where: {
          isStunting: true,
          session: { villageId },
        },
      }),
    ]);

  const balita = residents.filter((r) => calcAgeYears(r.birthDate) < 5).length;
  const ibuHamil = residents.filter((r) => r.isPregnant).length;
  const balitaStunting = residents.filter((r) => r.isStunting).length;

  return {
    balitaStunting,
    ibuHamil,
    balita,
    dasawismaCount,
    posyanduSessionsThisMonth,
    stuntingFromVisits,
  };
}
