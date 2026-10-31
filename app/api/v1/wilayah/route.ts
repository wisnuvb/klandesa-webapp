import { requireApiKey } from "@/lib/api-keys/auth";
import { prisma } from "@/lib/prisma";
import { isKependudukanV2 } from "@/lib/kependudukan/sync";
import { apiOk, featureOff } from "@/lib/api-v1/http";

/** Pembagian wilayah desa: dusun (datar) dan RW → RT, dengan jumlah warga dan keluarga. Dusun dan RW saling silang. */
export async function GET(req: Request) {
  const auth = await requireApiKey(req, "kependudukan:read");
  if (!auth.ok) return auth.response;
  if (!isKependudukanV2(auth.ctx.village.settings)) return featureOff(auth);

  const units = await prisma.wilayahUnit.findMany({
    where: { villageId: auth.ctx.village.id, isActive: true },
    select: { id: true, type: true, name: true, parentId: true, _count: { select: { areaResidents: true, dusunResidents: true, areaHouseholds: true, dusunHouseholds: true } } },
  });
  const natural = (a: string, b: string) => a.localeCompare(b, "id", { numeric: true });
  const node = (u: (typeof units)[number]) => ({
    id: u.id,
    name: u.name,
    residents: u.type === "dusun" ? u._count.dusunResidents : u._count.areaResidents,
    households: u.type === "dusun" ? u._count.dusunHouseholds : u._count.areaHouseholds,
  });
  const rts = units.filter((u) => u.type === "rt");
  return apiOk(auth, {
    data: {
      dusun: units.filter((u) => u.type === "dusun").sort((a, b) => natural(a.name, b.name)).map(node),
      rw: units
        .filter((u) => u.type === "rw")
        .sort((a, b) => natural(a.name, b.name))
        .map((rw) => ({ ...node(rw), rt: rts.filter((r) => r.parentId === rw.id).sort((a, b) => natural(a.name, b.name)).map(node) })),
      rtTanpaRw: rts.filter((r) => r.parentId == null).sort((a, b) => natural(a.name, b.name)).map(node),
    },
  });
}
