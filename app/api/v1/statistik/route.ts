import { requireApiKey } from "@/lib/api-keys/auth";
import { prisma } from "@/lib/prisma";
import { apiOk } from "@/lib/api-v1/http";
import { ageBuckets } from "@/lib/api-v1/views";

/** Statistik ringkas desa: hanya angka agregat, tanpa data pribadi. */
export async function GET(req: Request) {
  const auth = await requireApiKey(req, "statistik:read");
  if (!auth.ok) return auth.response;
  const villageId = auth.ctx.village.id;

  const [total, left, moved, byGender, births, kkGroups] = await Promise.all([
    prisma.resident.count({ where: { villageId } }),
    prisma.resident.count({ where: { villageId, isAlive: false } }),
    prisma.resident.count({ where: { villageId, isAlive: true, moveDate: { not: null } } }),
    prisma.resident.groupBy({ by: ["gender"], where: { villageId, isAlive: true, moveDate: null }, _count: { _all: true } }),
    prisma.resident.findMany({ where: { villageId, isAlive: true, moveDate: null }, select: { birthDate: true } }),
    prisma.resident.groupBy({ by: ["kk"], where: { villageId, isAlive: true, moveDate: null, kk: { not: null } } }),
  ]);
  const gender = (g: string) => byGender.find((x) => x.gender === g)?._count._all ?? 0;
  return apiOk(auth, {
    data: {
      penduduk: {
        aktif: births.length,
        meninggal: left,
        pindah: moved,
        tercatat: total,
        lakiLaki: gender("Laki-laki"),
        perempuan: gender("Perempuan"),
        kelompokUmur: ageBuckets(births.map((b) => b.birthDate)),
      },
      keluarga: { aktif: kkGroups.length },
      diperbaruiPada: new Date().toISOString(),
    },
  });
}
